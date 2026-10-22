import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { unlink } from "fs/promises";
import { Prisma } from "@prisma/client";
import { basename, join } from "path";
import { PaymentGatewayService } from "../payments/payment-gateway.service";
import { CommerceRepository } from "../repositories/commerce.repository";
import { getUploadsDirectory, localUploadsEnabled } from "../common/deployment-config";
import { GuestCheckoutDto, ShippingDetailsDto } from "../controllers/guest-checkout.dto";
import { shippingPolicy } from "./shipping-policy";

type SessionUser = {
  sub: string;
  email: string;
  role: "customer" | "merchant" | "super-admin";
  merchantId?: string;
  merchantStatus?: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
};

@Injectable()
export class CommerceService {
  private readonly lowStockThreshold = 5;
  private readonly subOrderDelayHours = Number(process.env.MERCHANT_SUBORDER_DELAY_HOURS ?? 24);

  constructor(
    private readonly repository: CommerceRepository,
    private readonly paymentGateway: PaymentGatewayService,
  ) {}

  private decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
    if (value == null) {
      return 0;
    }

    return Number(value);
  }

  private isMissingSchemaError(error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    return error.code === "P2021" || error.code === "P2022" || error.message.includes("does not exist in the current database");
  }

  private sanitizeImageUrls(images: string[]) {
    return images.map((item) => item.trim()).filter(Boolean);
  }

  private requireAtLeastOneImage(images: string[]) {
    const sanitized = this.sanitizeImageUrls(images);
    if (sanitized.length === 0) {
      throw new BadRequestException("At least one product image is required.");
    }

    const hasInvalidImage = sanitized.some((url) => this.extractLocalUploadFileName(url) == null);
    if (hasInvalidImage) {
      throw new BadRequestException("Product image must be uploaded through /api/uploads/images.");
    }

    return sanitized;
  }

  private extractLocalUploadFileName(imageUrl: string) {
    const value = imageUrl.trim();
    if (!value) {
      return null;
    }

    if (value.startsWith("/uploads/")) {
      return basename(value);
    }

    if (value.startsWith("http://") || value.startsWith("https://")) {
      try {
        const parsed = new URL(value);
        if (parsed.pathname.startsWith("/uploads/")) {
          return basename(parsed.pathname);
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  private async removeLocalUploadFiles(imageUrls: string[]) {
    if (!localUploadsEnabled()) return;
    const fileNames = Array.from(
      new Set(
        imageUrls
          .map((url) => this.extractLocalUploadFileName(url))
          .filter((name): name is string => Boolean(name)),
      ),
    );

    await Promise.all(
      fileNames.map(async (fileName) => {
        try {
          await unlink(join(getUploadsDirectory(), fileName));
        } catch {
          // Best-effort cleanup; product lifecycle should not fail on missing files.
        }
      }),
    );
  }

  private normalizePlanType(plan: "monthly_subscription" | "bamora_commission" | "ten_order_limit") {
    if (plan === "monthly_subscription") {
      return "MONTHLY_SUBSCRIPTION" as const;
    }

    if (plan === "bamora_commission") {
      return "BAMORA_COMMISSION" as const;
    }

    return "TEN_ORDER_LIMIT" as const;
  }

  private normalizeSubscriptionStatus(status?: "pending" | "active" | "expired") {
    if (!status) {
      return undefined;
    }

    return status.toUpperCase() as "PENDING" | "ACTIVE" | "EXPIRED";
  }

  private async ensureMerchantPlanAccess(merchantId: string) {
    const plan = (await this.repository.findMerchantPlanByMerchantId(merchantId)) ?? (await this.repository.ensureMerchantPlan(merchantId));
    if (plan.approvalStatus !== "ACTIVE" || !plan.selectedPlan) {
      throw new BadRequestException("Merchant plan is not active.");
    }

    if (plan.selectedPlan === "MONTHLY_SUBSCRIPTION") {
      const isExpired = !!(plan.subscriptionActiveUntil && plan.subscriptionActiveUntil.getTime() < Date.now());
      if (plan.subscriptionPaymentStatus !== "ACTIVE" || isExpired) {
        throw new BadRequestException("Merchant monthly subscription is not active.");
      }
    }

    return plan;
  }

  private async createAlertIfMissing(input: {
    code: string;
    title: string;
    body: string;
    merchantId?: string;
    orderId?: string;
    level?: string;
  }) {
    const existing = await this.repository.findOpenAdminAlert(input.code, input.merchantId, input.orderId);
    if (!existing) {
      await this.repository.createAdminAlert(input);
    }
  }

  private async monitorDelayedSubOrders() {
    const delayed = await this.repository.listDelayedSubOrders(new Date());
    for (const subOrder of delayed) {
      await this.repository.updateSubOrderAttention(subOrder.id, "DELAYED", new Date());
      await this.repository.createMerchantActivityLog({
        merchantId: subOrder.merchantId,
        action: "SUB_ORDER_DELAYED",
        entityType: "merchant_sub_order",
        entityId: subOrder.id,
        details: `Sub-order ${subOrder.subOrderNumber} exceeded processing SLA`,
      });
      await this.createAlertIfMissing({
        code: "DELAYED_SUBORDER",
        title: "Delayed merchant sub-order",
        body: `Sub-order ${subOrder.subOrderNumber} for merchant ${subOrder.merchant.businessName} is delayed.`,
        merchantId: subOrder.merchantId,
        orderId: subOrder.orderId,
        level: "critical",
      });
    }

    return delayed;
  }

  private async resolveCustomerId(user?: SessionUser) {
    const userId = user?.sub;
    if (!userId) {
      throw new BadRequestException("Customer user id is required.");
    }

    const customer = await this.repository.findCustomerByUserId(userId);
    if (!customer) {
      throw new NotFoundException("Customer profile not found.");
    }

    return customer.id;
  }

  private async resolveMerchantId(user?: SessionUser) {
    if (user?.merchantId) {
      return user.merchantId;
    }

    if (!user?.sub) {
      throw new BadRequestException("Merchant identity is required.");
    }

    const merchant = await this.repository.findMerchantByUserId(user.sub);
    if (!merchant) {
      throw new NotFoundException("Merchant profile not found.");
    }

    return merchant.id;
  }

  private resolveOrderMerchantId(order: {
    subOrders?: Array<{ merchantId: string }>;
    items: Array<{ variant: { product: { merchantId: string } } }>;
  }) {
    return order.subOrders?.[0]?.merchantId ?? order.items[0]?.variant.product.merchantId ?? null;
  }

  async customerDashboard(user?: SessionUser) {
    const customerId = await this.resolveCustomerId(user);
    const customer = await this.repository.customerDashboard(customerId);
    if (!customer) {
      throw new NotFoundException("Customer dashboard not found.");
    }

    const cart = await this.repository.getCart(customerId);
    const orders = await this.repository.listCustomerOrders(customerId);

    const products = await this.repository.listProductsForAdmin();

    return {
      profile: {
        id: customer.user.id,
        fullName: `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || "BAMORA Customer",
        email: customer.user.email,
        phone: customer.user.phone,
        locale: customer.user.locale,
      },
      addresses: customer.addresses.map((address) => ({
        id: address.id,
        label: address.label ?? "Address",
        line1: `${address.street}${address.building ? ` ${address.building}` : ""}`.trim(),
        city: address.city,
        isDefault: address.isDefault,
      })),
      products: products.map((product) => {
        const leadVariant = product.variants[0];
        const preferredCategory =
          product.categories.find((item) => item.category.parentId != null)?.category ??
          product.categories[0]?.category;
        return {
          id: product.id,
          merchantId: product.merchantId,
          name: product.titleAr,
          category: preferredCategory?.nameAr ?? "عام",
          stock: leadVariant?.inventory?.quantity ?? 0,
          price: leadVariant ? this.decimalToNumber(leadVariant.price).toFixed(2) : "0.00",
          images: product.images.map((item) => item.url),
          sizes: product.variants.map((item) => item.size),
          colors: product.variants.map((item) => item.color),
        };
      }),
      favorites: customer.favorites.map((item) => item.productId),
      cart:
        cart?.items.map((item) => ({
          id: item.id,
          productId: item.variant.productId,
          quantity: item.quantity,
          size: item.variant.size,
          color: item.variant.color,
          productName: item.variant.product.titleAr,
          productImageUrl: item.variant.product.images[0]?.url,
        })) ?? [],
      orders: orders.map((order) => ({
        id: order.id,
        productId: order.items[0]?.variant.productId ?? undefined,
        merchantId: this.resolveOrderMerchantId(order),
        customerId: order.customerId,
        status: order.status.toLowerCase(),
        total: this.decimalToNumber(order.total).toFixed(2),
        paymentStatus: order.payment?.status ?? "PENDING",
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          id: item.id,
          title: item.titleSnapshot,
          quantity: item.quantity,
          size: item.sizeSnapshot,
          color: item.colorSnapshot,
          unitPrice: this.decimalToNumber(item.unitPrice).toFixed(2),
          imageUrl: item.imageSnapshot,
        })),
        statusHistory: order.statusHistory.map((entry) => ({
          status: entry.status,
          note: entry.note,
          at: entry.createdAt,
        })),
      })),
    };
  }

  async upsertAddress(input: { id?: string; label: string; line1: string; city: string; isDefault: boolean; phone?: string; shippingZoneId?: string }, user?: SessionUser) {
    const customerId = await this.resolveCustomerId(user);
    let zones = await this.repository.listShippingZones();
    if (zones.length === 0) {
      await this.repository.ensureDefaultShippingZone();
      zones = await this.repository.listShippingZones();
    }
    const zoneId = input.shippingZoneId ?? zones[0]?.id;
    if (!zoneId) {
      throw new BadRequestException("No shipping zones configured.");
    }

    if (input.isDefault) {
      await this.repository.unsetDefaultAddresses(customerId);
    }

    const address = await this.repository.upsertAddress({
      customerId,
      id: input.id,
      label: input.label,
      city: input.city,
      street: input.line1,
      phone: input.phone ?? "000000000",
      shippingZoneId: zoneId,
      isDefault: input.isDefault,
    });

    return {
      id: address.id,
      label: address.label,
      line1: address.street,
      city: address.city,
      isDefault: address.isDefault,
    };
  }

  async toggleFavorite(productId: string, user?: SessionUser) {
    const customerId = await this.resolveCustomerId(user);
    const existing = await this.repository.toggleFavorite(customerId, productId);

    if (existing) {
      await this.repository.deleteFavorite(customerId, productId);
    } else {
      await this.repository.createFavorite(customerId, productId);
    }

    const dashboard = await this.repository.customerDashboard(customerId);
    return dashboard?.favorites.map((item) => item.productId) ?? [];
  }

  async addToCart(input: { productId: string; quantity: number; size: string; color: string }, user?: SessionUser) {
    const customerId = await this.resolveCustomerId(user);
    const cart = await this.repository.ensureCart(customerId);

    const variants = await this.repository.listProductVariants(input.productId);
    const target = variants.find((variant) => variant.size === input.size && variant.color === input.color) ?? variants[0];
    if (!target) {
      throw new NotFoundException("Product variant not found.");
    }

    const available = (target.inventory?.quantity ?? 0) - (target.inventory?.reserved ?? 0);
    if (available < input.quantity) {
      throw new BadRequestException("Selected quantity is not available.");
    }

    const item = await this.repository.upsertCartItem({
      cartId: cart.id,
      variantId: target.id,
      quantity: input.quantity,
    });

    return {
      id: item.id,
      productId: input.productId,
      quantity: item.quantity,
      size: target.size,
      color: target.color,
    };
  }

  async removeCartItem(itemId: string, user?: SessionUser) {
    await this.resolveCustomerId(user);
    const result = await this.repository.removeCartItem(itemId);
    return result.count > 0;
  }

  async publicShippingZones() {
    return [{ id: shippingPolicy.countryCode, code: shippingPolicy.countryCode, baseRate: shippingPolicy.ratePerOrder }];
  }

  publicShippingPolicy() {
    return shippingPolicy;
  }

  async guestCheckout(input: GuestCheckoutDto) {
    return this.createCheckout(undefined, input, input);
  }

  async checkout(user?: SessionUser, shipping?: ShippingDetailsDto) {
    return this.createCheckout(user, shipping);
  }

  private async createCheckout(user?: SessionUser, shipping?: ShippingDetailsDto, guest?: GuestCheckoutDto) {
    this.paymentGateway.assertEnabled();
    const customerId = guest ? null : await this.resolveCustomerId(user);
    await this.repository.ensureOrderItemImageSnapshotColumn();
    await this.repository.ensureMerchantSubOrderAttentionStateColumn();
    const hasMerchantPlanSchema = await this.repository.hasMerchantPlanTable();
    const hasMerchantAttentionStateType = await this.repository.hasPostgresType("MerchantAttentionState");

    return this.repository.runInTransaction(async (tx) => {
      const customer = customerId ? await tx.customer.findUnique({
        where: { id: customerId },
        include: {
          user: true,
          addresses: {
            where: { isDefault: true },
            take: 1,
          },
        },
      }) : null;

      if (!guest && !customer) {
        throw new NotFoundException("Customer not found.");
      }

      const address = shipping
        ? { phone: shipping.phone, city: shipping.city, street: shipping.street, building: null }
        : customer?.addresses[0];
      if (!address) {
        throw new BadRequestException("Default shipping address is required before checkout.");
      }
      const shippingName = shipping?.name ?? (`${customer?.firstName ?? ""} ${customer?.lastName ?? ""}`.trim() || customer?.user.email);
      if (!shippingName) {
        throw new BadRequestException("A recipient name is required to place an order.");
      }

      const savedCart = customerId ? await tx.cart.findFirst({
        where: { customerId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      images: true,
                    },
                  },
                  inventory: true,
                },
              },
            },
          },
        },
      }) : null;
      const guestItems: Array<{
        variantId: string;
        quantity: number;
        variant: Prisma.ProductVariantGetPayload<{ include: { inventory: true; product: { include: { images: true } } } }>;
      }> = [];
      if (guest) {
        for (const item of guest.items) {
          const variant = await tx.productVariant.findFirst({
            where: {
              productId: item.productId,
              size: item.size,
              color: item.color,
              product: { status: "PUBLISHED", merchant: { status: "ACTIVE" } },
            },
            include: { inventory: true, product: { include: { images: true } } },
          });
          if (!variant) {
            throw new BadRequestException("Selected product option is unavailable.");
          }
          if (guestItems.some((entry) => entry.variantId === variant.id)) {
            throw new BadRequestException("Duplicate product options are not allowed.");
          }
          guestItems.push({ variantId: variant.id, quantity: item.quantity, variant });
        }
      }
      const cart = guest ? { id: null, items: guestItems } : savedCart;

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException("Cart is empty.");
      }

      for (const cartItem of cart.items) {
        if (!Number.isInteger(cartItem.quantity) || cartItem.quantity < 1 || cartItem.quantity > 20) {
          throw new BadRequestException("Cart contains an invalid quantity.");
        }
        if (cartItem.variant.product.status !== "PUBLISHED") {
          throw new BadRequestException("Product is no longer available.");
        }
        const quantity = (cartItem.variant.inventory?.quantity ?? 0) - (cartItem.variant.inventory?.reserved ?? 0);
        if (quantity < cartItem.quantity) {
          throw new BadRequestException(`Insufficient stock for ${cartItem.variant.product.titleAr}.`);
        }
      }

      const subtotal = cart.items.reduce((total, item) => total + Number(item.variant.price) * item.quantity, 0);
      const shippingTotal = shippingPolicy.ratePerOrder;
      const total = subtotal + shippingTotal;

      const orderNumber = `BMO-${Date.now()}`;
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          status: "PENDING",
          subtotal: new Prisma.Decimal(subtotal),
          shippingTotal: new Prisma.Decimal(shippingTotal),
          total: new Prisma.Decimal(total),
          shippingName,
          shippingPhone: address.phone,
          shippingCity: address.city,
          shippingStreet: `${address.street}${address.building ? ` ${address.building}` : ""}`.trim(),
          shippingZoneCode: shippingPolicy.countryCode,
          statusHistory: {
            create: {
              status: "PENDING",
              note: "Order created",
            },
          },
        },
      });

      const orderItems: Array<{ id: string; variantId: string; merchantId: string; lineTotal: number }> = [];
      for (const cartItem of cart.items) {
        const created = await tx.orderItem.create({
          data: {
            orderId: order.id,
            variantId: cartItem.variantId,
            quantity: cartItem.quantity,
            unitPrice: cartItem.variant.price,
            titleSnapshot: cartItem.variant.product.titleAr,
            imageSnapshot: cartItem.variant.product.images[0]?.url ?? "",
            colorSnapshot: cartItem.variant.color,
            sizeSnapshot: cartItem.variant.size,
          },
        });

        const stockUpdate = await tx.inventory.updateMany({
          where: {
            variantId: cartItem.variantId,
            quantity: { gte: cartItem.quantity + (cartItem.variant.inventory?.reserved ?? 0) },
            reserved: cartItem.variant.inventory?.reserved ?? 0,
          },
          data: {
            quantity: {
              decrement: cartItem.quantity,
            },
          },
        });
        if (stockUpdate.count !== 1) {
          throw new BadRequestException("Insufficient stock; please refresh your cart.");
        }

        const latestInventory = await tx.inventory.findUnique({ where: { variantId: cartItem.variantId } });
        if (latestInventory && latestInventory.quantity <= this.lowStockThreshold) {
          await tx.inventoryAlert.create({
            data: {
              variantId: cartItem.variantId,
              quantity: latestInventory.quantity,
              threshold: this.lowStockThreshold,
            },
          });
        }

        orderItems.push({
          id: created.id,
          variantId: cartItem.variantId,
          merchantId: cartItem.variant.product.merchantId,
          lineTotal: Number(cartItem.variant.price) * cartItem.quantity,
        });
      }

      const grouped = new Map<string, Array<{ orderItemId: string; quantity: number; lineTotal: number }>>();
      for (const cartItem of cart.items) {
        const createdOrderItem = orderItems.find((item) => item.variantId === cartItem.variantId);
        if (!createdOrderItem) {
          continue;
        }

        const list = grouped.get(cartItem.variant.product.merchantId) ?? [];
        list.push({ orderItemId: createdOrderItem.id, quantity: cartItem.quantity, lineTotal: createdOrderItem.lineTotal });
        grouped.set(cartItem.variant.product.merchantId, list);
      }

      let idx = 1;
      for (const [merchantId, items] of grouped.entries()) {
        let merchant: {
          id: string;
          businessName: string;
          userId: string;
        } | null = null;
        let merchantPlan: any = null;

        if (hasMerchantPlanSchema) {
          merchant = await tx.merchant.findUnique({
            where: { id: merchantId },
            include: { plan: true, user: true },
          });
          if (!merchant) {
            throw new NotFoundException("Merchant profile not found.");
          }
          merchantPlan = (merchant as any).plan ?? null;
        } else {
          merchant = await tx.merchant.findUnique({
            where: { id: merchantId },
            include: { user: true },
          });
          if (!merchant) {
            throw new NotFoundException("Merchant profile not found.");
          }
        }

        if (hasMerchantPlanSchema) {
          if (!merchantPlan || merchantPlan.approvalStatus !== "ACTIVE" || !merchantPlan.selectedPlan) {
            throw new BadRequestException(`Merchant ${merchant.businessName} is not ready to receive orders yet.`);
          }

          if (merchantPlan.selectedPlan === "MONTHLY_SUBSCRIPTION") {
            const isExpired = !!(merchantPlan.subscriptionActiveUntil && merchantPlan.subscriptionActiveUntil.getTime() < Date.now());
            if (merchantPlan.subscriptionPaymentStatus !== "ACTIVE" || isExpired) {
              throw new BadRequestException(`Merchant ${merchant.businessName} subscription is inactive.`);
            }
          }

          if (merchantPlan.selectedPlan === "TEN_ORDER_LIMIT" && merchantPlan.tenOrderCycleCount >= merchantPlan.tenOrderLimit) {
            await tx.merchantPlan.update({
              where: { merchantId },
              data: {
                blockedAt: new Date(),
                outstandingBalance: merchantPlan.bamoraFeesOwed,
              },
            });
            await this.createAlertIfMissing({
              code: "TEN_ORDER_LIMIT_REACHED",
              title: "Merchant requires review",
              body: `Merchant ${merchant.businessName} reached order cycle limit and is pending review.`,
              merchantId,
              level: "warning",
            });
            throw new BadRequestException(`Merchant ${merchant.businessName} reached the current order-cycle limit.`);
          }
        }

        if (hasMerchantAttentionStateType) {
          const subOrder = await tx.merchantSubOrder.create({
            data: {
              orderId: order.id,
              merchantId,
              subOrderNumber: `${orderNumber}-${idx}`,
              status: "PENDING",
              fulfillmentStatus: "PENDING",
              subtotal: new Prisma.Decimal(items.reduce((sum, item) => sum + item.lineTotal, 0)),
              processByAt: new Date(Date.now() + this.subOrderDelayHours * 60 * 60 * 1000),
            },
          });

          for (const item of items) {
            await tx.subOrderItem.create({
              data: {
                subOrderId: subOrder.id,
                orderItemId: item.orderItemId,
                quantity: item.quantity,
              },
            });
          }

          const subOrderTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
          if (hasMerchantPlanSchema && merchantPlan && (merchantPlan.selectedPlan === "BAMORA_COMMISSION" || merchantPlan.selectedPlan === "TEN_ORDER_LIMIT")) {
            const fee = subOrderTotal * this.decimalToNumber(merchantPlan.commissionRate);
            await tx.merchantBamoraCharge.create({
              data: {
                merchantId,
                orderId: order.id,
                subOrderId: subOrder.id,
                planType: merchantPlan.selectedPlan,
                orderAmount: new Prisma.Decimal(subOrderTotal),
                bamoraFee: new Prisma.Decimal(fee),
                remainingAmount: new Prisma.Decimal(fee),
                dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
              },
            });

            await tx.merchantPlan.update({
              where: { merchantId },
              data: {
                bamoraFeesOwed: { increment: fee },
                outstandingBalance: { increment: fee },
                tenOrderCycleCount: merchantPlan.selectedPlan === "TEN_ORDER_LIMIT" ? { increment: 1 } : undefined,
              },
            });

            try {
              await tx.merchantSubOrder.update({
                where: { id: subOrder.id },
                data: {
                  attentionState: "PENDING_BAMORA_PAYMENT",
                },
              });
            } catch (error) {
              if (!this.isMissingSchemaError(error)) {
                throw error;
              }
            }
          }

          try {
            await tx.merchantActivityLog.create({
              data: {
                merchantId,
                action: "SUB_ORDER_ASSIGNED",
                entityType: "merchant_sub_order",
                entityId: subOrder.id,
                details: `Assigned new sub-order ${subOrder.subOrderNumber}`,
              },
            });
          } catch (error) {
            if (!this.isMissingSchemaError(error)) {
              throw error;
            }
          }
        }

        idx += 1;
      }

      const paymentIntent = await this.paymentGateway.createPaymentIntent({
        orderId: order.id,
        amount: total,
        currency: "ILS",
        metadata: { orderNumber },
      });

      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          provider: paymentIntent.provider,
          amount: new Prisma.Decimal(total),
          currency: "ILS",
          externalId: paymentIntent.externalId,
          status: paymentIntent.status === "PAID" ? "PAID" : "PENDING",
          transactions: {
            create: {
              type: "AUTHORIZATION",
              status: paymentIntent.status === "FAILED" ? "FAILED" : "SUCCESS",
              providerReference: paymentIntent.externalId,
              amount: new Prisma.Decimal(total),
              currency: "ILS",
              metadata: {
                checkoutUrl: paymentIntent.checkoutUrl,
              },
            },
          },
        },
      });

      if (cart.id) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      }

      if (customer) {
        await tx.notification.create({
          data: {
            userId: customer.userId,
            audience: "USER",
            type: "ORDER",
            title: "تم إنشاء الطلب",
            body: `رقم الطلب ${orderNumber} قيد المعالجة الآن.`,
          },
        });
      }

      const orderContactEmail = shipping?.email ?? customer?.user.email;
      if (orderContactEmail) {
        await tx.emailNotification.create({
          data: {
            toEmail: orderContactEmail,
            subject: `BAMORA order ${orderNumber}`,
            body: `Order ${orderNumber} has been placed successfully. Recipient: ${shippingName}.`,
          },
        });
      }

      return {
        id: order.id,
        orderNumber,
        merchantId: grouped.keys().next().value ?? null,
        customerId: order.customerId,
        status: order.status.toLowerCase(),
        total: this.decimalToNumber(order.total).toFixed(2),
        payment: {
          id: payment.id,
          status: payment.status,
          provider: payment.provider,
          checkoutUrl: paymentIntent.checkoutUrl,
        },
      };
    });
  }

  async listCustomerOrders(user?: SessionUser) {
    const customerId = await this.resolveCustomerId(user);
    const orders = await this.repository.listCustomerOrders(customerId);
    return orders.map((order) => ({
      id: order.id,
      productId: order.items[0]?.variant.productId ?? undefined,
      merchantId: this.resolveOrderMerchantId(order),
      customerId: order.customerId,
      status: order.status.toLowerCase(),
      total: this.decimalToNumber(order.total).toFixed(2),
      paymentStatus: order.payment?.status ?? "PENDING",
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        title: item.titleSnapshot,
        quantity: item.quantity,
        size: item.sizeSnapshot,
        color: item.colorSnapshot,
        unitPrice: this.decimalToNumber(item.unitPrice).toFixed(2),
        imageUrl: item.imageSnapshot,
      })),
      statusHistory: order.statusHistory.map((entry) => ({
        status: entry.status,
        note: entry.note,
        at: entry.createdAt,
      })),
    }));
  }

  async cancelOrder(orderId: string, user?: SessionUser) {
    const customerId = await this.resolveCustomerId(user);
    const order = await this.repository.db.order.findFirst({
      where: { id: orderId, customerId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException("Order not found.");
    }

    if (["DELIVERED", "RETURNED"].includes(order.status)) {
      throw new BadRequestException("Delivered orders cannot be cancelled.");
    }

    await this.repository.runInTransaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
      await tx.orderStatusHistory.create({ data: { orderId, status: "CANCELLED", note: "Cancelled by customer" } });

      for (const item of order.items) {
        await tx.inventory.update({ where: { variantId: item.variantId }, data: { quantity: { increment: item.quantity } } });
      }
    });

    return { success: true };
  }

  async requestReturn(orderId: string, reason: string | undefined, user?: SessionUser) {
    const customerId = await this.resolveCustomerId(user);
    const order = await this.repository.db.order.findFirst({
      where: { id: orderId, customerId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException("Order not found.");
    }

    if (order.status !== "DELIVERED") {
      throw new BadRequestException("Only delivered orders can be returned.");
    }

    await this.repository.db.order.update({ where: { id: orderId }, data: { status: "RETURN_REQUESTED" } });
    await this.repository.db.orderStatusHistory.create({
      data: {
        orderId,
        status: "RETURN_REQUESTED",
        note: reason ?? "Return requested by customer",
      },
    });

    return { success: true };
  }

  async markNotificationRead(notificationId: string, user?: SessionUser) {
    if (!user?.sub) {
      throw new BadRequestException("Authenticated user is required.");
    }

    const updated = await this.repository.markNotificationRead(notificationId, user.sub);
    return { updated: updated.count > 0 };
  }

  async listCustomerNotifications(user?: SessionUser) {
    const userId = user?.sub;
    if (!userId) {
      throw new BadRequestException("User id is required.");
    }

    return this.repository.listNotificationsByUser(userId);
  }

  async submitReview(input: { productId: string; rating: number; comment?: string }, user?: SessionUser) {
    const customerId = await this.resolveCustomerId(user);
    return this.repository.db.review.create({
      data: {
        customerId,
        productId: input.productId,
        rating: input.rating,
        comment: input.comment,
      },
    });
  }

  async searchProducts(filters: {
    q?: string;
    minPrice?: number;
    maxPrice?: number;
    color?: string;
    size?: string;
    categoryId?: string;
    sort?: "price_asc" | "price_desc" | "newest";
  }) {
    const products = await this.repository.db.product.findMany({
      where: {
        status: "PUBLISHED",
        merchant: { status: "ACTIVE" },
        OR: filters.q
          ? [
              { titleAr: { contains: filters.q, mode: "insensitive" } },
              { titleEn: { contains: filters.q, mode: "insensitive" } },
              { descriptionAr: { contains: filters.q, mode: "insensitive" } },
            ]
          : undefined,
        categories: filters.categoryId
          ? {
              some: {
                categoryId: filters.categoryId,
              },
            }
          : undefined,
        variants: {
          some: {
            color: filters.color ? { equals: filters.color, mode: "insensitive" } : undefined,
            size: filters.size ? { equals: filters.size, mode: "insensitive" } : undefined,
            price: {
              gte: filters.minPrice != null ? new Prisma.Decimal(filters.minPrice) : undefined,
              lte: filters.maxPrice != null ? new Prisma.Decimal(filters.maxPrice) : undefined,
            },
          },
        },
      },
      include: {
        images: true,
        categories: { include: { category: true } },
        variants: {
          include: {
            inventory: true,
          },
        },
      },
      orderBy:
        filters.sort === "newest"
          ? { createdAt: "desc" }
          : undefined,
    });

    const mapped = products.map((product) => {
      const variant = product.variants[0];
      return {
        id: product.id,
        name: product.titleAr,
        detail: product.descriptionAr,
        price: variant ? this.decimalToNumber(variant.price).toFixed(2) : "0.00",
        stock: variant?.inventory?.quantity ?? 0,
        colors: product.variants.map((item) => item.color),
        sizes: product.variants.map((item) => item.size),
        image: product.images[0]?.url,
        images: product.images.map((image) => image.url),
        category: (product.categories.find((entry) => entry.category.parentId != null) ?? product.categories[0])?.category.nameAr ?? "",
        createdAt: product.createdAt,
      };
    });

    if (filters.sort === "price_asc") {
      mapped.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (filters.sort === "price_desc") {
      mapped.sort((a, b) => Number(b.price) - Number(a.price));
    }

    return mapped;
  }

  async merchantDashboard(user?: SessionUser) {
    const merchantId = await this.resolveMerchantId(user);
    const plan = await this.repository.ensureMerchantPlan(merchantId);
    const merchant = await this.repository.db.merchant.findUnique({
      where: { id: merchantId },
      include: {
        user: true,
      },
    });
    if (!merchant) {
      throw new NotFoundException("Merchant profile not found.");
    }

    const [products, orders, lowStock, alerts] = await Promise.all([
      this.repository.listProductsForMerchant(merchantId),
      this.repository.listOrdersForMerchant(merchantId),
      this.repository.listLowInventory(this.lowStockThreshold),
      this.repository.listInventoryAlerts(),
    ]);

    return {
      merchantId,
      profile: {
        businessName: merchant.businessName,
        email: merchant.user.email,
        status: merchant.status,
      },
      products,
      orders,
      inventory: {
        lowStock: lowStock.filter((item) => item.variant.product.merchantId === merchantId),
        alerts: alerts.filter((item) => item.variant.product.merchantId === merchantId),
      },
      stats: {
        productCount: products.length,
        orderCount: orders.length,
        revenue: orders.reduce((sum, item) => sum + this.decimalToNumber(item.subtotal), 0).toFixed(2),
      },
      plan,
    };
  }

  async merchantUpsertProduct(
    input: { id?: string; name: string; stock: number; price: string; images: string[]; sizes: string[]; colors: string[] },
    user?: SessionUser,
  ) {
    const merchantId = await this.resolveMerchantId(user);
    const images = this.requireAtLeastOneImage(input.images);
    let staleImages: string[] = [];

    if (input.id) {
      const existing = await this.repository.findProductById(input.id);
      if (!existing || existing.merchantId !== merchantId) {
        throw new NotFoundException("Product not found.");
      }

      staleImages = existing.images.map((image) => image.url).filter((url) => !images.includes(url));
    }

    const product = await this.repository.createOrUpdateProduct({
      id: input.id,
      merchantId,
      name: input.name,
      stock: input.stock,
      price: Number(input.price),
      images,
      sizes: input.sizes,
      colors: input.colors,
    });

    if (staleImages.length > 0) {
      await this.removeLocalUploadFiles(staleImages);
    }

    await this.repository.createMerchantActivityLog({
      merchantId,
      action: input.id ? "PRODUCT_UPDATED" : "PRODUCT_CREATED",
      entityType: "product",
      entityId: product.id,
      newValue: { name: input.name, stock: input.stock, price: input.price },
    });

    return product;
  }

  async merchantDeleteProduct(id: string, user?: SessionUser) {
    const merchantId = await this.resolveMerchantId(user);
    const product = await this.repository.findProductById(id);
    if (!product || product.merchantId !== merchantId) {
      throw new NotFoundException("Product not found.");
    }

    const imageUrls = product.images.map((image) => image.url);
    const deleted = await this.repository.deleteProduct(id);
    if (deleted.count > 0) {
      await this.removeLocalUploadFiles(imageUrls);
      await this.repository.createMerchantActivityLog({
        merchantId,
        action: "PRODUCT_DELETED",
        entityType: "product",
        entityId: id,
      });
    }
    return deleted.count > 0;
  }

  async merchantUpdateOrderStatus(
    orderId: string,
    status: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURN_REQUESTED" | "RETURNED",
    user?: SessionUser,
  ) {
    const merchantId = await this.resolveMerchantId(user);
    const plan = await this.ensureMerchantPlanAccess(merchantId);
    const subOrder = await this.repository.db.merchantSubOrder.findFirst({ where: { orderId, merchantId } });
    if (!subOrder) {
      throw new NotFoundException("Order is not available for this merchant.");
    }

    if (plan.selectedPlan !== "MONTHLY_SUBSCRIPTION") {
      const charge = await this.repository.findBamoraChargeBySubOrderId(subOrder.id);
      if (charge && charge.paymentStatus !== "CONFIRMED") {
        await this.repository.updateSubOrderAttention(subOrder.id, "PENDING_BAMORA_PAYMENT");
        throw new BadRequestException("BAMORA fee payment must be confirmed before updating this order.");
      }
    }

    await this.repository.db.merchantSubOrder.update({
      where: { id: subOrder.id },
      data: {
        status: status as "PENDING" | "CONFIRMED" | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURN_REQUESTED" | "RETURNED",
        attentionState: "NORMAL",
        delayedAt: null,
      },
    });

    const order = await this.repository.db.order.update({ where: { id: orderId }, data: { status } });
    await this.repository.db.orderStatusHistory.create({ data: { orderId, status, note: `Updated by merchant ${merchantId}` } });
    await this.repository.createMerchantActivityLog({
      merchantId,
      action: "SUB_ORDER_STATUS_UPDATED",
      entityType: "order",
      entityId: orderId,
      details: `Status updated to ${status}`,
    });

    return order;
  }

  async updateShipmentForMerchant(
    input: {
      orderId: string;
      carrierCode: string;
      trackingNumber: string;
      shippingCost: number;
      status: "PENDING" | "LABEL_CREATED" | "IN_TRANSIT" | "DELIVERED" | "RETURNED" | "EXCEPTION" | "CANCELLED";
    },
    user?: SessionUser,
  ) {
    const merchantId = await this.resolveMerchantId(user);
    const subOrder = await this.repository.db.merchantSubOrder.findFirst({ where: { orderId: input.orderId, merchantId } });
    if (!subOrder) {
      throw new NotFoundException("Merchant sub-order not found.");
    }

    let carrier = await this.repository.findShippingCarrierByCode(input.carrierCode);
    if (!carrier) {
      carrier = await this.repository.upsertShippingCarrier({ code: input.carrierCode, name: input.carrierCode.toUpperCase() });
    }

    const shipment = await this.repository.upsertShipmentForSubOrder({
      subOrderId: subOrder.id,
      carrierId: carrier.id,
      trackingNumber: input.trackingNumber,
      cost: input.shippingCost,
      status: input.status,
    });

    await this.repository.db.orderStatusHistory.create({
      data: {
        orderId: input.orderId,
        status: input.status === "DELIVERED" ? "DELIVERED" : input.status === "IN_TRANSIT" ? "SHIPPED" : "PROCESSING",
        note: `Shipment updated: ${input.status}`,
      },
    });

    await this.repository.createMerchantActivityLog({
      merchantId,
      action: "SHIPMENT_UPDATED",
      entityType: "shipment",
      entityId: shipment.id,
      details: `Shipment status set to ${input.status}`,
    });

    return shipment;
  }

  async adminDashboard() {
    await this.repository.markOverdueCharges(new Date());
    await this.monitorDelayedSubOrders();

    const [merchants, products, orders, categories, users, coupons, inventoryAlerts] = await Promise.all([
      this.repository.listMerchants(),
      this.repository.listProductsForAdmin(),
      this.repository.listAllOrders(),
      this.repository.listCategories(),
      this.repository.listUsers(),
      this.repository.listCoupons(),
      this.repository.listInventoryAlerts(),
    ]);

    const [planApprovals, bamoraCharges, adminAlerts, merchantActivity] = await Promise.all([
      this.repository.listPendingPlanApprovals(),
      this.repository.listBamoraCharges(),
      this.repository.listAdminAlerts(),
      this.repository.listMerchantActivityLogs(),
    ]);

    const merchantCount = users.filter((user) => user.role === "MERCHANT").length;
    const customerCount = users.filter((user) => user.role === "CUSTOMER").length;

    return {
      merchants,
      products,
      orders,
      categories,
      users,
      coupons,
      inventoryAlerts,
      planApprovals,
      bamoraCharges,
      adminAlerts,
      merchantActivity,
      stats: {
        merchantCount,
        customerCount,
        subscriberCount: merchantCount + customerCount,
        orderCount: orders.length,
        productCount: products.length,
        userCount: users.length,
        platformRevenue: orders.reduce((sum, order) => sum + this.decimalToNumber(order.total), 0).toFixed(2),
      },
    };
  }

  listMerchants() {
    return this.repository.listMerchants();
  }

  async updateMerchantStatus(id: string, status: "pending" | "active" | "rejected" | "suspended") {
    const normalizedStatus = status.toUpperCase() as "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
    const merchant = await this.repository.updateMerchantStatus(id, normalizedStatus);
    await this.repository.createMerchantActivityLog({
      merchantId: merchant.id,
      action: "MERCHANT_STATUS_UPDATED",
      entityType: "merchant",
      entityId: merchant.id,
      newValue: { status: normalizedStatus },
    });

    return {
      ...merchant,
      credentials: null,
    };
  }

  async getMerchantPlan(user?: SessionUser) {
    const merchantId = await this.resolveMerchantId(user);
    return this.repository.ensureMerchantPlan(merchantId);
  }

  async requestMerchantPlan(plan: "monthly_subscription" | "bamora_commission" | "ten_order_limit", user?: SessionUser) {
    const merchantId = await this.resolveMerchantId(user);
    const updated = await this.repository.requestMerchantPlan(merchantId, this.normalizePlanType(plan));
    await this.repository.createMerchantActivityLog({
      merchantId,
      action: "PLAN_REQUESTED",
      entityType: "merchant_plan",
      entityId: updated.id,
      newValue: { selectedPlan: updated.selectedPlan },
    });
    await this.createAlertIfMissing({
      code: "PLAN_APPROVAL_REQUESTED",
      title: "Merchant plan approval requested",
      body: `Merchant ${merchantId} requested plan ${updated.selectedPlan}.`,
      merchantId,
      level: "info",
    });
    return updated;
  }

  listPendingPlanApprovals() {
    return this.repository.listPendingPlanApprovals();
  }

  async reviewMerchantPlan(
    merchantId: string,
    input: {
      decision: "approve" | "reject";
      notes?: string;
      subscriptionMonths?: number;
      subscriptionPaymentStatus?: "pending" | "active" | "expired";
    },
    user?: SessionUser,
  ) {
    if (!user?.sub) {
      throw new BadRequestException("Admin identity is required.");
    }

    const approve = input.decision === "approve";
    const activeUntil = approve && input.subscriptionMonths
      ? new Date(Date.now() + input.subscriptionMonths * 30 * 24 * 60 * 60 * 1000)
      : null;

    const plan = await this.repository.reviewMerchantPlan(merchantId, {
      adminUserId: user.sub,
      approve,
      notes: input.notes,
      subscriptionActiveUntil: activeUntil,
      subscriptionPaymentStatus: this.normalizeSubscriptionStatus(input.subscriptionPaymentStatus),
    });

    await this.repository.createMerchantActivityLog({
      merchantId,
      action: approve ? "PLAN_APPROVED" : "PLAN_REJECTED",
      entityType: "merchant_plan",
      entityId: plan.id,
      details: input.notes,
    });

    return plan;
  }

  async reopenMerchantAfterPayment(merchantId: string) {
    const plan = await this.repository.findMerchantPlanByMerchantId(merchantId);
    if (!plan) {
      throw new NotFoundException("Merchant plan not found.");
    }

    const updated = await this.repository.updateMerchantPlanStatus(merchantId, {
      outstandingBalance: new Prisma.Decimal(0),
      blockedAt: null,
      reopenedAt: new Date(),
      tenOrderCycleCount: 0,
    });

    await this.repository.createMerchantActivityLog({
      merchantId,
      action: "MERCHANT_REOPENED",
      entityType: "merchant_plan",
      entityId: updated.id,
      details: "Reopened after admin payment confirmation",
    });

    return updated;
  }

  async listDelayedOrders() {
    await this.repository.markOverdueCharges(new Date());
    await this.monitorDelayedSubOrders();
    const orders = await this.repository.listAllOrders();
    return orders.filter((order) => order.subOrders.some((subOrder) => subOrder.attentionState === "DELAYED"));
  }

  listBamoraCharges() {
    return this.repository.listBamoraCharges();
  }

  async confirmBamoraCharge(chargeId: string, user?: SessionUser) {
    this.paymentGateway.assertEnabled();
    if (!user?.sub) {
      throw new BadRequestException("Admin identity is required.");
    }

    const charge = await this.repository.confirmBamoraCharge(chargeId, user.sub);
    const plan = await this.repository.findMerchantPlanByMerchantId(charge.merchantId);

    if (plan) {
      const fee = this.decimalToNumber(charge.bamoraFee);
      await this.repository.updateMerchantPlanStatus(charge.merchantId, {
        bamoraFeesPaid: new Prisma.Decimal(this.decimalToNumber(plan.bamoraFeesPaid) + fee),
        outstandingBalance: new Prisma.Decimal(Math.max(0, this.decimalToNumber(plan.outstandingBalance) - fee)),
      });
    }

    await this.repository.updateSubOrderAttention(charge.subOrderId, "NORMAL", null);
    await this.repository.createMerchantActivityLog({
      merchantId: charge.merchantId,
      action: "BAMORA_FEE_CONFIRMED",
      entityType: "merchant_bamora_charge",
      entityId: charge.id,
      details: `Charge confirmed by admin ${user.sub}`,
    });

    return charge;
  }

  listAdminAlerts() {
    return this.repository.listAdminAlerts();
  }

  resolveAdminAlert(id: string) {
    return this.repository.resolveAdminAlert(id);
  }

  listMerchantActivity(merchantId?: string) {
    return this.repository.listMerchantActivityLogs(merchantId);
  }

  async deleteMerchant(id: string) {
    const result = await this.repository.db.merchant.deleteMany({ where: { id } });
    return result.count > 0;
  }

  listAdminProducts() {
    return this.repository.listProductsForAdmin();
  }

  async adminUpsertProduct(input: { id?: string; merchantId: string; name: string; stock: number; price: string; images: string[]; sizes: string[]; colors: string[] }) {
    const images = this.requireAtLeastOneImage(input.images);
    let staleImages: string[] = [];

    if (input.id) {
      const existing = await this.repository.findProductById(input.id);
      if (!existing) {
        throw new NotFoundException("Product not found.");
      }

      staleImages = existing.images.map((image) => image.url).filter((url) => !images.includes(url));
    }

    const product = await this.repository.createOrUpdateProduct({
      id: input.id,
      merchantId: input.merchantId,
      name: input.name,
      stock: input.stock,
      price: Number(input.price),
      images,
      sizes: input.sizes,
      colors: input.colors,
    });

    if (staleImages.length > 0) {
      await this.removeLocalUploadFiles(staleImages);
    }

    return product;
  }

  async adminDeleteProduct(id: string) {
    const product = await this.repository.findProductById(id);
    if (!product) {
      return false;
    }

    const imageUrls = product.images.map((image) => image.url);
    const result = await this.repository.deleteProduct(id);
    if (result.count > 0) {
      await this.removeLocalUploadFiles(imageUrls);
    }

    return result.count > 0;
  }

  listAdminOrders() {
    return this.repository.listAllOrders();
  }

  async adminUpdateOrderStatus(orderId: string, status: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURN_REQUESTED" | "RETURNED") {
    const order = await this.repository.db.order.update({ where: { id: orderId }, data: { status } });
    await this.repository.db.orderStatusHistory.create({ data: { orderId, status, note: "Updated by admin" } });
    return order;
  }

  listCategories() {
    return this.repository.listCategories();
  }

  async listPublicCategories() {
    const categories = await this.repository.listCategories();
    return categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      titleAr: category.nameAr,
      icon: "🛍️",
      parentId: category.parentId,
    }));
  }

  upsertCategory(input: { id?: string; nameAr: string; slug: string; icon: string; parentId: string | null }) {
    return this.repository.upsertCategory(input);
  }

  async deleteCategory(id: string) {
    const result = await this.repository.deleteCategory(id);
    return result.count > 0;
  }

  async createOffer(input: { title: string; code?: string; discountText: string; merchantId?: string }) {
    const parsed = Number(input.discountText.replace(/[^0-9.]/g, "")) || 0;
    return this.repository.createCoupon({
      merchantId: input.merchantId,
      title: input.title,
      code: input.code ?? `BAMORA-${Date.now()}`,
      discountType: "%",
      discountValue: parsed,
    });
  }

  listCoupons() {
    return this.repository.listCoupons();
  }

  async sendBroadcast(input: { audience: "all-users" | "customers" | "merchants"; title: string; body: string }) {
    const targetRole = input.audience === "customers" ? "CUSTOMER" : input.audience === "merchants" ? "MERCHANT" : null;
    const users = await this.repository.db.user.findMany({ where: targetRole ? { role: targetRole } : undefined });

    for (const user of users) {
      await this.repository.createNotification({
        userId: user.id,
        audience: "USER",
        type: "MARKETING",
        title: input.title,
        body: input.body,
      });
      await this.repository.createEmailNotification({ to: user.email, subject: input.title, body: input.body });
    }

    return {
      id: `broadcast-${Date.now()}`,
      audience: input.audience,
      title: input.title,
      body: input.body,
      sentAt: new Date().toISOString(),
      recipients: users.length,
    };
  }

  listUsers() {
    return this.repository.listUsers();
  }

  updateUserStatus(id: string, status: "active" | "suspended") {
    return this.repository.updateUserStatus(id, status.toUpperCase() as "ACTIVE" | "SUSPENDED");
  }

  async deleteUser(id: string) {
    const result = await this.repository.db.user.deleteMany({ where: { id } });
    return result.count > 0;
  }

  async listSupportTickets() {
    return this.repository.db.notification.findMany({
      where: {
        type: "SUPPORT",
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async assignSupportTicket(id: string, assignedTo: string) {
    const updated = await this.repository.db.notification.update({
      where: { id },
      data: {
        body: `Assigned to ${assignedTo}`,
      },
    });

    return updated;
  }

  async updateSupportTicketStatus(id: string, status: "open" | "in_progress" | "resolved") {
    const updated = await this.repository.db.notification.update({
      where: { id },
      data: {
        body: `Ticket status changed to ${status}`,
      },
    });

    return updated;
  }

  listShippingCarriers() {
    return this.repository.listShippingCarriers();
  }

  upsertShippingCarrier(input: { id?: string; code: string; name: string; active?: boolean; apiBaseUrl?: string }) {
    return this.repository.upsertShippingCarrier(input);
  }

  async createPaymentForOrder(orderId: string) {
    this.paymentGateway.assertEnabled();
    const order = await this.repository.db.order.findUnique({ where: { id: orderId }, include: { payment: true } });
    if (!order) {
      throw new NotFoundException("Order not found.");
    }

    if (order.payment) {
      return order.payment;
    }

    const intent = await this.paymentGateway.createPaymentIntent({
      orderId,
      amount: this.decimalToNumber(order.total),
      currency: "ILS",
    });

    return this.repository.db.payment.create({
      data: {
        orderId,
        provider: intent.provider,
        amount: order.total,
        currency: "ILS",
        status: intent.status === "PAID" ? "PAID" : "PENDING",
        externalId: intent.externalId,
      },
    });
  }

  async markPaymentStatus(orderId: string, status: "PENDING" | "PAID" | "FAILED" | "REFUNDED") {
    this.paymentGateway.assertEnabled();
    const payment = await this.repository.db.payment.update({ where: { orderId }, data: { status } });

    if (status === "PAID") {
      await this.repository.db.order.update({ where: { id: orderId }, data: { status: "CONFIRMED" } });
      await this.repository.db.orderStatusHistory.create({ data: { orderId, status: "CONFIRMED", note: "Payment captured" } });
    }

    return payment;
  }

  async refundOrder(orderId: string, reason?: string) {
    this.paymentGateway.assertEnabled();
    const payment = await this.repository.db.payment.findUnique({ where: { orderId } });
    if (!payment) {
      throw new NotFoundException("Payment not found for order.");
    }

    const refundResult = await this.paymentGateway.refund({
      paymentExternalId: payment.externalId ?? payment.id,
      amount: this.decimalToNumber(payment.amount),
      reason,
    });

    await this.repository.db.refund.create({
      data: {
        paymentId: payment.id,
        orderId,
        amount: payment.amount,
        status: refundResult.status === "COMPLETED" ? "COMPLETED" : refundResult.status === "FAILED" ? "FAILED" : "PENDING",
        providerReference: refundResult.refundExternalId,
        reason,
      },
    });

    await this.repository.db.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
    await this.repository.db.order.update({ where: { id: orderId }, data: { status: "RETURNED" } });
    await this.repository.db.orderStatusHistory.create({ data: { orderId, status: "RETURNED", note: reason ?? "Refund completed" } });

    return { success: true, refundExternalId: refundResult.refundExternalId };
  }

  async integrationsConfig() {
    const carriers = await this.repository.listShippingCarriers();
    return {
      payment: {
        provider: this.paymentGateway.getProviderName(),
        status: this.paymentGateway.isEnabled() ? "ready" : "disabled",
        supported: ["manual", "paypal", "stripe"],
      },
      shipping: {
        carriers,
        status: carriers.length > 0 ? "ready" : "partially_configured",
      },
      notifications: {
        inApp: true,
        email: true,
        push: "planned",
      },
      webhooks: {
        paymentWebhook: "/api/integrations/webhooks/payment",
        shippingWebhook: "/api/integrations/webhooks/shipping",
      },
    };
  }
}
