import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PaymentGatewayService } from "../payments/payment-gateway.service";
import { CommerceRepository } from "../repositories/commerce.repository";

type SessionUser = {
  sub: string;
  email: string;
  role: "customer" | "merchant" | "super-admin";
};

@Injectable()
export class CommerceService {
  private readonly lowStockThreshold = 5;

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

  private async resolveCustomerId(user?: SessionUser, fallbackUserId?: string) {
    const userId = user?.sub ?? fallbackUserId;
    if (!userId) {
      throw new BadRequestException("Customer user id is required.");
    }

    const customer = await this.repository.findCustomerByUserId(userId);
    if (!customer) {
      throw new NotFoundException("Customer profile not found.");
    }

    return customer.id;
  }

  private async resolveMerchantId(user?: SessionUser, fallbackMerchantId?: string) {
    if (fallbackMerchantId) {
      return fallbackMerchantId;
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

  async customerDashboard(user?: SessionUser, fallbackUserId?: string) {
    const customerId = await this.resolveCustomerId(user, fallbackUserId);
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
        return {
          id: product.id,
          merchantId: product.merchantId,
          name: product.titleAr,
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
        })) ?? [],
      orders: orders.map((order) => ({
        id: order.id,
        merchantId: order.subOrders[0]?.merchantId ?? null,
        customerId: order.customerId,
        status: order.status.toLowerCase(),
        total: this.decimalToNumber(order.total).toFixed(2),
        paymentStatus: order.payment?.status ?? "PENDING",
        statusHistory: order.statusHistory.map((entry) => ({
          status: entry.status,
          note: entry.note,
          at: entry.createdAt,
        })),
      })),
    };
  }

  async upsertAddress(
    input: { id?: string; label: string; line1: string; city: string; isDefault: boolean; phone?: string; shippingZoneId?: string },
    user?: SessionUser,
    fallbackUserId?: string,
  ) {
    const customerId = await this.resolveCustomerId(user, fallbackUserId);
    const zones = await this.repository.listShippingZones();
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

  async toggleFavorite(productId: string, user?: SessionUser, fallbackUserId?: string) {
    const customerId = await this.resolveCustomerId(user, fallbackUserId);
    const existing = await this.repository.toggleFavorite(customerId, productId);

    if (existing) {
      await this.repository.deleteFavorite(customerId, productId);
    } else {
      await this.repository.createFavorite(customerId, productId);
    }

    const dashboard = await this.repository.customerDashboard(customerId);
    return dashboard?.favorites.map((item) => item.productId) ?? [];
  }

  async addToCart(
    input: { productId: string; quantity: number; size: string; color: string },
    user?: SessionUser,
    fallbackUserId?: string,
  ) {
    const customerId = await this.resolveCustomerId(user, fallbackUserId);
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

  async removeCartItem(itemId: string, user?: SessionUser, fallbackUserId?: string) {
    await this.resolveCustomerId(user, fallbackUserId);
    const result = await this.repository.removeCartItem(itemId);
    return result.count > 0;
  }

  async checkout(user?: SessionUser, fallbackUserId?: string) {
    const customerId = await this.resolveCustomerId(user, fallbackUserId);

    return this.repository.runInTransaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
        include: {
          user: true,
          addresses: {
            include: {
              shippingZone: true,
            },
            where: { isDefault: true },
            take: 1,
          },
        },
      });

      if (!customer) {
        throw new NotFoundException("Customer not found.");
      }

      const address = customer.addresses[0];
      if (!address) {
        throw new BadRequestException("Default shipping address is required before checkout.");
      }

      const cart = await tx.cart.findFirst({
        where: { customerId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                  inventory: true,
                },
              },
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException("Cart is empty.");
      }

      for (const cartItem of cart.items) {
        const quantity = cartItem.variant.inventory?.quantity ?? 0;
        if (quantity < cartItem.quantity) {
          throw new BadRequestException(`Insufficient stock for ${cartItem.variant.product.titleAr}.`);
        }
      }

      const subtotal = cart.items.reduce((total, item) => total + Number(item.variant.price) * item.quantity, 0);
      const merchantCount = new Set(cart.items.map((item) => item.variant.product.merchantId)).size;
      const shippingTotal = Number(address.shippingZone.baseRate) * Math.max(1, merchantCount);
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
          shippingName: `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || customer.user.email,
          shippingPhone: address.phone,
          shippingCity: address.city,
          shippingStreet: `${address.street}${address.building ? ` ${address.building}` : ""}`.trim(),
          shippingZoneCode: address.shippingZone.code,
          statusHistory: {
            create: {
              status: "PENDING",
              note: "Order created",
            },
          },
        },
      });

      const orderItems = [] as Array<{ id: string; merchantId: string; lineTotal: number }>;
      for (const cartItem of cart.items) {
        const created = await tx.orderItem.create({
          data: {
            orderId: order.id,
            variantId: cartItem.variantId,
            quantity: cartItem.quantity,
            unitPrice: cartItem.variant.price,
            titleSnapshot: cartItem.variant.product.titleAr,
            colorSnapshot: cartItem.variant.color,
            sizeSnapshot: cartItem.variant.size,
          },
        });

        await tx.inventory.update({
          where: { variantId: cartItem.variantId },
          data: {
            quantity: {
              decrement: cartItem.quantity,
            },
          },
        });

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
          merchantId: cartItem.variant.product.merchantId,
          lineTotal: Number(cartItem.variant.price) * cartItem.quantity,
        });
      }

      const grouped = new Map<string, Array<{ orderItemId: string; quantity: number; lineTotal: number }>>();
      for (const cartItem of cart.items) {
        const createdOrderItem = orderItems.find((item) => item.merchantId === cartItem.variant.product.merchantId && item.lineTotal === Number(cartItem.variant.price) * cartItem.quantity);
        if (!createdOrderItem) {
          continue;
        }

        const list = grouped.get(cartItem.variant.product.merchantId) ?? [];
        list.push({ orderItemId: createdOrderItem.id, quantity: cartItem.quantity, lineTotal: createdOrderItem.lineTotal });
        grouped.set(cartItem.variant.product.merchantId, list);
      }

      let idx = 1;
      for (const [merchantId, items] of grouped.entries()) {
        const subOrder = await tx.merchantSubOrder.create({
          data: {
            orderId: order.id,
            merchantId,
            subOrderNumber: `${orderNumber}-${idx}`,
            status: "PENDING",
            fulfillmentStatus: "PENDING",
            subtotal: new Prisma.Decimal(items.reduce((sum, item) => sum + item.lineTotal, 0)),
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

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      await tx.notification.create({
        data: {
          userId: customer.userId,
          audience: "USER",
          type: "ORDER",
          title: "تم إنشاء الطلب",
          body: `رقم الطلب ${orderNumber} قيد المعالجة الآن.`,
        },
      });

      await tx.emailNotification.create({
        data: {
          toEmail: customer.user.email,
          subject: `BAMORA order ${orderNumber}`,
          body: `Order ${orderNumber} has been placed successfully.`,
        },
      });

      return {
        id: order.id,
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

  async listCustomerOrders(user?: SessionUser, fallbackUserId?: string) {
    const customerId = await this.resolveCustomerId(user, fallbackUserId);
    return this.repository.listCustomerOrders(customerId);
  }

  async cancelOrder(orderId: string, user?: SessionUser, fallbackUserId?: string) {
    const customerId = await this.resolveCustomerId(user, fallbackUserId);
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

  async requestReturn(orderId: string, reason: string | undefined, user?: SessionUser, fallbackUserId?: string) {
    const customerId = await this.resolveCustomerId(user, fallbackUserId);
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

  async listCustomerNotifications(user?: SessionUser, fallbackUserId?: string) {
    const userId = user?.sub ?? fallbackUserId;
    if (!userId) {
      throw new BadRequestException("User id is required.");
    }

    return this.repository.listNotificationsByUser(userId);
  }

  async submitReview(input: { productId: string; rating: number; comment?: string }, user?: SessionUser, fallbackUserId?: string) {
    const customerId = await this.resolveCustomerId(user, fallbackUserId);
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
        price: variant ? this.decimalToNumber(variant.price).toFixed(2) : "0.00",
        stock: variant?.inventory?.quantity ?? 0,
        colors: product.variants.map((item) => item.color),
        sizes: product.variants.map((item) => item.size),
        image: product.images[0]?.url,
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

  async merchantDashboard(user?: SessionUser, merchantIdFallback?: string) {
    const merchantId = await this.resolveMerchantId(user, merchantIdFallback);
    const [products, orders, lowStock, alerts] = await Promise.all([
      this.repository.listProductsForMerchant(merchantId),
      this.repository.listOrdersForMerchant(merchantId),
      this.repository.listLowInventory(this.lowStockThreshold),
      this.repository.listInventoryAlerts(),
    ]);

    return {
      merchantId,
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
    };
  }

  async merchantUpsertProduct(
    input: { id?: string; merchantId: string; name: string; stock: number; price: string; images: string[]; sizes: string[]; colors: string[] },
    user?: SessionUser,
  ) {
    const merchantId = await this.resolveMerchantId(user, input.merchantId);
    return this.repository.createOrUpdateProduct({
      id: input.id,
      merchantId,
      name: input.name,
      stock: input.stock,
      price: Number(input.price),
      images: input.images,
      sizes: input.sizes,
      colors: input.colors,
    });
  }

  async merchantDeleteProduct(id: string, user?: SessionUser, merchantIdFallback?: string) {
    const merchantId = await this.resolveMerchantId(user, merchantIdFallback);
    const product = await this.repository.findProductById(id);
    if (!product || product.merchantId !== merchantId) {
      throw new NotFoundException("Product not found.");
    }

    const deleted = await this.repository.deleteProduct(id);
    return deleted.count > 0;
  }

  async merchantUpdateOrderStatus(
    orderId: string,
    status: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURN_REQUESTED" | "RETURNED",
    user?: SessionUser,
    merchantIdFallback?: string,
  ) {
    const merchantId = await this.resolveMerchantId(user, merchantIdFallback);
    const subOrder = await this.repository.db.merchantSubOrder.findFirst({ where: { orderId, merchantId } });
    if (!subOrder) {
      throw new NotFoundException("Order is not available for this merchant.");
    }

    await this.repository.db.merchantSubOrder.update({
      where: { id: subOrder.id },
      data: {
        status: status as "PENDING" | "CONFIRMED" | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURN_REQUESTED" | "RETURNED",
      },
    });

    const order = await this.repository.db.order.update({ where: { id: orderId }, data: { status } });
    await this.repository.db.orderStatusHistory.create({ data: { orderId, status, note: `Updated by merchant ${merchantId}` } });

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
    merchantIdFallback?: string,
  ) {
    const merchantId = await this.resolveMerchantId(user, merchantIdFallback);
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

    return shipment;
  }

  async adminDashboard() {
    const [merchants, products, orders, categories, users, coupons, inventoryAlerts] = await Promise.all([
      this.repository.listMerchants(),
      this.repository.listProductsForAdmin(),
      this.repository.listAllOrders(),
      this.repository.listCategories(),
      this.repository.listUsers(),
      this.repository.listCoupons(),
      this.repository.listInventoryAlerts(),
    ]);

    return {
      merchants,
      products,
      orders,
      categories,
      users,
      coupons,
      inventoryAlerts,
      stats: {
        merchantCount: merchants.length,
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

  async updateMerchantStatus(id: string, status: "pending" | "approved" | "suspended") {
    return this.repository.updateMerchantStatus(id, status.toUpperCase() as "PENDING" | "APPROVED" | "SUSPENDED");
  }

  async deleteMerchant(id: string) {
    const result = await this.repository.db.merchant.deleteMany({ where: { id } });
    return result.count > 0;
  }

  listAdminProducts() {
    return this.repository.listProductsForAdmin();
  }

  async adminUpsertProduct(input: { id?: string; merchantId: string; name: string; stock: number; price: string; images: string[]; sizes: string[]; colors: string[] }) {
    return this.repository.createOrUpdateProduct({
      id: input.id,
      merchantId: input.merchantId,
      name: input.name,
      stock: input.stock,
      price: Number(input.price),
      images: input.images,
      sizes: input.sizes,
      colors: input.colors,
    });
  }

  async adminDeleteProduct(id: string) {
    const result = await this.repository.deleteProduct(id);
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
    const payment = await this.repository.db.payment.update({ where: { orderId }, data: { status } });

    if (status === "PAID") {
      await this.repository.db.order.update({ where: { id: orderId }, data: { status: "CONFIRMED" } });
      await this.repository.db.orderStatusHistory.create({ data: { orderId, status: "CONFIRMED", note: "Payment captured" } });
    }

    return payment;
  }

  async refundOrder(orderId: string, reason?: string) {
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
        status: "ready",
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
