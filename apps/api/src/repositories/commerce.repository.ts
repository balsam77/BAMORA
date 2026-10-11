import { Injectable } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CommerceRepository {
  constructor(private readonly prisma: PrismaService) {}

  private isMissingTableError(error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    return error.code === "P2021" || error.code === "P2022" || error.message.includes("does not exist in the current database");
  }

  get db() {
    return this.prisma;
  }

  runInTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(callback, {
      timeout: 20000,
    });
  }

  findUserById(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  findCustomerByUserId(userId: string) {
    return this.prisma.customer.findUnique({ where: { userId } });
  }

  findMerchantByUserId(userId: string) {
    return this.prisma.merchant.findUnique({ where: { userId }, include: { user: true, plan: true } });
  }

  customerDashboard(customerId: string) {
    return this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        user: true,
        addresses: {
          include: {
            shippingZone: true,
          },
          orderBy: { createdAt: "desc" },
        },
        favorites: true,
      },
    });
  }

  getCart(customerId: string) {
    return this.prisma.cart.findFirst({
      where: { customerId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                inventory: true,
                product: {
                  include: {
                    images: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  ensureCart(customerId: string) {
    return this.prisma.cart.upsert({
      where: { sessionId: `customer-${customerId}` },
      update: {},
      create: {
        customerId,
        sessionId: `customer-${customerId}`,
      },
    });
  }

  findVariantById(variantId: string) {
    return this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: true,
        inventory: true,
      },
    });
  }

  listProductVariants(productId: string) {
    return this.prisma.productVariant.findMany({ where: { productId }, include: { inventory: true } });
  }

  upsertCartItem(input: { cartId: string; variantId: string; quantity: number }) {
    return this.prisma.cartItem.upsert({
      where: {
        cartId_variantId: {
          cartId: input.cartId,
          variantId: input.variantId,
        },
      },
      update: {
        quantity: {
          increment: input.quantity,
        },
      },
      create: {
        cartId: input.cartId,
        variantId: input.variantId,
        quantity: input.quantity,
      },
    });
  }

  removeCartItem(cartItemId: string) {
    return this.prisma.cartItem.deleteMany({ where: { id: cartItemId } });
  }

  upsertAddress(input: {
    customerId: string;
    id?: string;
    label?: string;
    city: string;
    street: string;
    building?: string;
    phone: string;
    shippingZoneId: string;
    isDefault: boolean;
  }) {
    if (input.id) {
      return this.prisma.address.update({
        where: { id: input.id },
        data: {
          label: input.label,
          city: input.city,
          street: input.street,
          building: input.building,
          phone: input.phone,
          shippingZoneId: input.shippingZoneId,
          isDefault: input.isDefault,
        },
      });
    }

    return this.prisma.address.create({
      data: {
        customerId: input.customerId,
        label: input.label,
        city: input.city,
        street: input.street,
        building: input.building,
        phone: input.phone,
        shippingZoneId: input.shippingZoneId,
        isDefault: input.isDefault,
      },
    });
  }

  unsetDefaultAddresses(customerId: string) {
    return this.prisma.address.updateMany({ where: { customerId }, data: { isDefault: false } });
  }

  listShippingZones() {
    return this.prisma.shippingZone.findMany({ where: { active: true }, orderBy: { nameAr: "asc" } });
  }

  async ensureDefaultShippingZone() {
    return this.prisma.shippingZone.upsert({
      where: { code: "IL" },
      update: { active: true },
      create: {
        code: "IL",
        nameEn: "Center",
        nameAr: "الوسط",
        baseRate: new Prisma.Decimal(10),
        etaDaysMin: 1,
        etaDaysMax: 2,
        active: true,
      },
    });
  }

  async ensureOrderItemImageSnapshotColumn() {
    try {
      await this.prisma.$executeRawUnsafe(
        "ALTER TABLE \"order_items\" ADD COLUMN IF NOT EXISTS \"image_snapshot\" TEXT NOT NULL DEFAULT ''",
      );
    } catch (error) {
      if (!this.isMissingTableError(error)) {
        throw error;
      }
    }
  }

  async ensureMerchantSubOrderAttentionStateColumn() {
    try {
      await this.prisma.$executeRawUnsafe(
        "ALTER TABLE \"merchant_sub_orders\" ADD COLUMN IF NOT EXISTS \"attention_state\" TEXT NOT NULL DEFAULT 'NONE'",
      );
      await this.prisma.$executeRawUnsafe(
        "ALTER TABLE \"merchant_sub_orders\" ADD COLUMN IF NOT EXISTS \"process_by_at\" TIMESTAMP(3)",
      );
      await this.prisma.$executeRawUnsafe(
        "ALTER TABLE \"merchant_sub_orders\" ADD COLUMN IF NOT EXISTS \"delayed_at\" TIMESTAMP(3)",
      );
    } catch (error) {
      if (!this.isMissingTableError(error)) {
        throw error;
      }
    }
  }

  async hasMerchantPlanTable() {
    const result = await this.prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'merchant_plans') AS exists",
    );

    return result[0]?.exists === true;
  }

  async hasPostgresType(typeName: string) {
    const result = await this.prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${typeName.replace(/'/g, "''")}') AS exists`,
    );

    return result[0]?.exists === true;
  }

  toggleFavorite(customerId: string, productId: string) {
    return this.prisma.favorite.findUnique({
      where: {
        customerId_productId: {
          customerId,
          productId,
        },
      },
    });
  }

  createFavorite(customerId: string, productId: string) {
    return this.prisma.favorite.create({ data: { customerId, productId } });
  }

  deleteFavorite(customerId: string, productId: string) {
    return this.prisma.favorite.delete({ where: { customerId_productId: { customerId, productId } } });
  }

  listCustomerOrders(customerId: string) {
    return this.prisma.order
      .findMany({
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
                },
              },
            },
          },
          statusHistory: {
            orderBy: { createdAt: "asc" },
          },
          payment: true,
          subOrders: {
            include: {
              merchant: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
      .catch(async (error) => {
        if (!this.isMissingTableError(error)) {
          throw error;
        }

        const legacyOrders = await this.prisma.order.findMany({
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
                  },
                },
              },
            },
            statusHistory: {
              orderBy: { createdAt: "asc" },
            },
            payment: true,
          },
          orderBy: { createdAt: "desc" },
        });

        return legacyOrders.map((order) => ({ ...order, subOrders: [] })) as never;
      });
  }

  listOrdersForMerchant(merchantId: string) {
    return this.prisma.merchantSubOrder
      .findMany({
        where: { merchantId },
        include: {
          order: {
            include: {
              customer: {
                include: {
                  user: true,
                },
              },
            },
          },
          items: {
            include: {
              orderItem: {
                include: {
                  variant: {
                    include: {
                      product: {
                        include: {
                          images: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          shipment: {
            include: {
              carrier: true,
            },
          },
          bamoraCharge: true,
        },
        orderBy: { createdAt: "desc" },
      })
      .then(async (subOrders) => {
        if (subOrders.length > 0) {
          return subOrders;
        }

        const directOrders = await this.prisma.order.findMany({
          where: {
            items: {
              some: {
                variant: {
                  product: {
                    merchantId,
                  },
                },
              },
            },
          },
          include: {
            customer: {
              include: {
                user: true,
              },
            },
            items: {
              where: {
                variant: {
                  product: {
                    merchantId,
                  },
                },
              },
              include: {
                variant: {
                  include: {
                    product: {
                      include: {
                        images: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        return directOrders.map((order) => ({
          id: `${order.id}-${merchantId}`,
          orderId: order.id,
          merchantId,
          subOrderNumber: order.orderNumber,
          status: order.status,
          fulfillmentStatus: order.status,
          subtotal: new Prisma.Decimal(order.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0)),
          attentionState: null,
          processByAt: null,
          delayedAt: null,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          order: {
            orderNumber: order.orderNumber,
            customer: {
              user: {
                email: order.customer.user.email,
              },
            },
          },
          items: order.items.map((item) => ({
            quantity: item.quantity,
            orderItem: item,
          })),
          shipment: null,
          bamoraCharge: null,
        })) as never;
      })
      .catch(async (error) => {
        if (!this.isMissingTableError(error)) {
          throw error;
        }

        const legacySubOrders = await this.prisma.$queryRaw<Array<{ id: string; order_id: string; status: string; subtotal: Prisma.Decimal | number; created_at: Date }>>`
          select id, order_id, status, subtotal, created_at
          from merchant_sub_orders
          where merchant_id = ${merchantId}
          order by created_at desc
        `;

        if (legacySubOrders.length === 0) {
          return [] as never;
        }

        const orderIds = Array.from(new Set(legacySubOrders.map((item) => item.order_id)));
        const subOrderIds = legacySubOrders.map((item) => item.id);

        const [orders, subOrderItems] = await Promise.all([
          this.prisma.order.findMany({
            where: { id: { in: orderIds } },
            include: {
              customer: {
                include: {
                  user: true,
                },
              },
            },
          }),
          this.prisma.subOrderItem.findMany({
            where: { subOrderId: { in: subOrderIds } },
            include: {
              orderItem: {
                include: {
                  variant: {
                    include: {
                      product: {
                        include: {
                          images: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          }),
        ]);

        const orderById = new Map(orders.map((order) => [order.id, order]));
        const itemsBySubOrderId = new Map<string, typeof subOrderItems>();
        for (const item of subOrderItems) {
          const current = itemsBySubOrderId.get(item.subOrderId) ?? [];
          current.push(item);
          itemsBySubOrderId.set(item.subOrderId, current);
        }

        return legacySubOrders.map((subOrder) => ({
          id: subOrder.id,
          orderId: subOrder.order_id,
          merchantId,
          subOrderNumber: subOrder.id,
          status: subOrder.status,
          fulfillmentStatus: subOrder.status,
          subtotal: subOrder.subtotal,
          attentionState: null,
          processByAt: null,
          delayedAt: null,
          createdAt: subOrder.created_at,
          updatedAt: subOrder.created_at,
          order: {
            orderNumber: orderById.get(subOrder.order_id)?.orderNumber ?? subOrder.order_id,
            customer: {
              user: {
                email: orderById.get(subOrder.order_id)?.customer?.user?.email ?? "-",
              },
            },
          },
          items: (itemsBySubOrderId.get(subOrder.id) ?? []).map((entry) => ({
            quantity: entry.quantity,
            orderItem: entry.orderItem,
          })),
          shipment: null,
          bamoraCharge: null,
        })) as never;
      });
  }

  listAllOrders() {
    return this.prisma.order
      .findMany({
        include: {
          customer: { include: { user: true } },
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      images: true,
                      merchant: {
                        include: {
                          user: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          payment: true,
          statusHistory: { orderBy: { createdAt: "asc" } },
          subOrders: {
            include: {
              merchant: {
                include: {
                  user: true,
                },
              },
              items: {
                include: {
                  orderItem: true,
                },
              },
              shipment: { include: { carrier: true } },
              bamoraCharge: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
      .catch(async (error) => {
        if (!this.isMissingTableError(error)) {
          throw error;
        }

        const legacyOrders = await this.prisma.order.findMany({
          include: {
            customer: { include: { user: true } },
            items: {
              include: {
                variant: {
                  include: {
                    product: {
                      include: {
                        images: true,
                        merchant: {
                          include: {
                            user: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            payment: true,
            statusHistory: { orderBy: { createdAt: "asc" } },
          },
          orderBy: { createdAt: "desc" },
        });

        return legacyOrders.map((order) => ({ ...order, subOrders: [] })) as never;
      });
  }

  listMerchants() {
    return this.prisma.merchant.findMany({
      include: {
        user: true,
        plan: true,
        merchantSubOrders: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  updateMerchantStatus(id: string, status: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED") {
    return this.prisma.merchant.update({
      where: { id },
      data: {
        status,
        approvedAt: status === "ACTIVE" ? new Date() : null,
      },
      include: {
        user: true,
      },
    });
  }

  listUsers() {
    return this.prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  }

  updateUserStatus(id: string, status: "ACTIVE" | "SUSPENDED") {
    return this.prisma.user.update({ where: { id }, data: { status } });
  }

  listCategories() {
    return this.prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  }

  upsertCategory(input: { id?: string; nameAr: string; slug: string; icon?: string; parentId?: string | null }) {
    if (input.id) {
      return this.prisma.category.update({
        where: { id: input.id },
        data: {
          nameAr: input.nameAr,
          nameEn: input.nameAr,
          slug: input.slug,
          parentId: input.parentId ?? null,
        },
      });
    }

    return this.prisma.category.create({
      data: {
        nameAr: input.nameAr,
        nameEn: input.nameAr,
        slug: input.slug,
        parentId: input.parentId ?? null,
      },
    });
  }

  deleteCategory(id: string) {
    return this.prisma.category.deleteMany({ where: { id } });
  }

  listProductsForAdmin() {
    return this.prisma.product.findMany({
      include: {
        merchant: true,
        variants: {
          include: {
            inventory: true,
          },
        },
        images: true,
        categories: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  listProductsForMerchant(merchantId: string) {
    return this.prisma.product.findMany({
      where: { merchantId },
      include: {
        variants: {
          include: {
            inventory: true,
          },
        },
        images: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  findProductById(productId: string) {
    return this.prisma.product.findUnique({
      where: { id: productId },
      include: { variants: { include: { inventory: true } }, images: true },
    });
  }

  deleteProduct(productId: string) {
    return this.prisma.product.deleteMany({ where: { id: productId } });
  }

  createOrUpdateProduct(input: {
    id?: string;
    merchantId: string;
    name: string;
    stock: number;
    price: number;
    images: string[];
    sizes: string[];
    colors: string[];
  }) {
    const slug = input.name.toLowerCase().replace(/\s+/g, "-") + `-${Date.now()}`;

    if (input.id) {
      return this.prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: input.id },
          data: {
            titleAr: input.name,
            titleEn: input.name,
            descriptionAr: input.name,
            descriptionEn: input.name,
            status: "PUBLISHED",
            images: {
              deleteMany: {},
              create: input.images.map((url, index) => ({ url, sortOrder: index })),
            },
          },
        });

        await tx.productVariant.updateMany({
          where: { productId: input.id },
          data: { price: new Prisma.Decimal(input.price) },
        });

        const variants = await tx.productVariant.findMany({
          where: { productId: input.id },
          select: { id: true },
        });

        if (variants.length > 0) {
          await tx.inventory.updateMany({
            where: { variantId: { in: variants.map((variant) => variant.id) } },
            data: { quantity: input.stock },
          });
        }

        return tx.product.findUniqueOrThrow({
          where: { id: input.id },
          include: {
            variants: { include: { inventory: true } },
            images: true,
          },
        });
      });
    }

    return this.prisma.product.create({
      data: {
        merchantId: input.merchantId,
        slug,
        titleAr: input.name,
        titleEn: input.name,
        descriptionAr: input.name,
        descriptionEn: input.name,
        status: "PUBLISHED",
        images: {
          create: input.images.map((url, index) => ({ url, sortOrder: index })),
        },
        variants: {
          create: (input.sizes.length > 0 ? input.sizes : ["One Size"]).map((size, index) => {
            const color = input.colors[index % Math.max(1, input.colors.length)] ?? "black";
            return {
              size,
              color,
              sku: `${slug}-${size}-${color}`.replace(/\s+/g, "-").toUpperCase(),
              price: new Prisma.Decimal(input.price),
              inventory: {
                create: {
                  quantity: input.stock,
                  reserved: 0,
                },
              },
            };
          }),
        },
      },
      include: {
        variants: { include: { inventory: true } },
        images: true,
      },
    });
  }

  listCoupons() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: "desc" }, include: { merchant: true, product: true } });
  }

  createCoupon(input: {
    merchantId?: string;
    productId?: string;
    title: string;
    code: string;
    discountType: string;
    discountValue: number;
    startsAt?: Date;
    endsAt?: Date;
  }) {
    return this.prisma.coupon.create({
      data: {
        merchantId: input.merchantId,
        productId: input.productId,
        title: input.title,
        code: input.code,
        discountType: input.discountType,
        discountValue: new Prisma.Decimal(input.discountValue),
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      },
    });
  }

  listNotificationsByUser(userId: string) {
    return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  }

  createNotification(input: {
    userId?: string;
    audience?: "ALL_USERS" | "CUSTOMERS" | "MERCHANTS" | "USER";
    type?: "ORDER" | "MARKETING" | "SYSTEM" | "SUPPORT";
    title: string;
    body: string;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        audience: input.audience ?? "USER",
        type: input.type ?? "SYSTEM",
        title: input.title,
        body: input.body,
      },
    });
  }

  markNotificationRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
  }

  listShippingCarriers() {
    return this.prisma.shippingCarrier.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } });
  }

  upsertShippingCarrier(input: { id?: string; code: string; name: string; active?: boolean; apiBaseUrl?: string }) {
    if (input.id) {
      return this.prisma.shippingCarrier.update({
        where: { id: input.id },
        data: {
          code: input.code,
          name: input.name,
          active: input.active ?? true,
          apiBaseUrl: input.apiBaseUrl,
        },
      });
    }

    return this.prisma.shippingCarrier.create({
      data: {
        code: input.code,
        name: input.name,
        active: input.active ?? true,
        apiBaseUrl: input.apiBaseUrl,
      },
    });
  }

  findShippingCarrierByCode(code: string) {
    return this.prisma.shippingCarrier.findFirst({ where: { code, active: true } });
  }

  upsertShipmentForSubOrder(input: {
    subOrderId: string;
    carrierId: string;
    trackingNumber: string;
    cost: number;
    status: "PENDING" | "LABEL_CREATED" | "IN_TRANSIT" | "DELIVERED" | "RETURNED" | "EXCEPTION" | "CANCELLED";
  }) {
    return this.prisma.shipment.upsert({
      where: { subOrderId: input.subOrderId },
      update: {
        carrierId: input.carrierId,
        trackingNumber: input.trackingNumber,
        cost: new Prisma.Decimal(input.cost),
        status: input.status,
      },
      create: {
        subOrderId: input.subOrderId,
        carrierId: input.carrierId,
        trackingNumber: input.trackingNumber,
        cost: new Prisma.Decimal(input.cost),
        status: input.status,
      },
      include: {
        carrier: true,
      },
    });
  }

  listShipmentsForOrder(orderId: string) {
    return this.prisma.shipment.findMany({
      where: { orderId },
      include: { carrier: true, subOrder: true },
      orderBy: { createdAt: "desc" },
    });
  }

  listLowInventory(threshold: number) {
    return this.prisma.inventory.findMany({
      where: {
        quantity: {
          lte: threshold,
        },
      },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { quantity: "asc" },
    });
  }

  createInventoryAlert(input: { variantId: string; quantity: number; threshold: number }) {
    return this.prisma.inventoryAlert.create({ data: input });
  }

  listInventoryAlerts() {
    return this.prisma.inventoryAlert.findMany({
      where: { resolvedAt: null },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  resolveInventoryAlert(id: string) {
    return this.prisma.inventoryAlert.update({ where: { id }, data: { resolvedAt: new Date() } });
  }

  createEmailNotification(input: { to: string; subject: string; body: string }) {
    return this.prisma.emailNotification.create({
      data: {
        toEmail: input.to,
        subject: input.subject,
        body: input.body,
      },
    });
  }

  listEmailNotifications() {
    return this.prisma.emailNotification.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  }

  ensureMerchantPlan(merchantId: string) {
    return this.prisma.merchantPlan
      .upsert({
        where: { merchantId },
        update: {},
        create: { merchantId },
      })
      .catch((error) => {
        if (this.isMissingTableError(error)) {
          return {
            id: `plan-missing-${merchantId}`,
            merchantId,
            selectedPlan: null,
            approvalStatus: "PENDING_PLAN_APPROVAL",
            subscriptionPaymentStatus: "PENDING",
            monthlySubscriptionAmount: new Prisma.Decimal(0),
            commissionRate: new Prisma.Decimal(0.2),
            tenOrderLimit: 10,
            tenOrderCycleCount: 0,
            bamoraFeesOwed: new Prisma.Decimal(0),
            bamoraFeesPaid: new Prisma.Decimal(0),
            outstandingBalance: new Prisma.Decimal(0),
            blockedAt: null,
            reopenedAt: null,
            requestedAt: null,
            approvedAt: null,
            rejectedAt: null,
            reviewedByAdminId: null,
            notes: null,
            subscriptionActiveUntil: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }

        throw error;
      });
  }

  findMerchantPlanByMerchantId(merchantId: string) {
    return this.prisma.merchantPlan.findUnique({ where: { merchantId } }).catch((error) => {
      if (this.isMissingTableError(error)) {
        return null;
      }

      throw error;
    });
  }

  requestMerchantPlan(merchantId: string, planType: "MONTHLY_SUBSCRIPTION" | "BAMORA_COMMISSION" | "TEN_ORDER_LIMIT") {
    return this.prisma.merchantPlan.upsert({
      where: { merchantId },
      update: {
        selectedPlan: planType,
        approvalStatus: "PENDING_PLAN_APPROVAL",
        requestedAt: new Date(),
        rejectedAt: null,
      },
      create: {
        merchantId,
        selectedPlan: planType,
        approvalStatus: "PENDING_PLAN_APPROVAL",
        requestedAt: new Date(),
      },
    });
  }

  reviewMerchantPlan(
    merchantId: string,
    input: {
      adminUserId: string;
      approve: boolean;
      notes?: string;
      subscriptionActiveUntil?: Date | null;
      subscriptionPaymentStatus?: "PENDING" | "ACTIVE" | "EXPIRED";
    },
  ) {
    return this.prisma.merchantPlan.update({
      where: { merchantId },
      data: {
        approvalStatus: input.approve ? "ACTIVE" : "REJECTED",
        approvedAt: input.approve ? new Date() : null,
        rejectedAt: input.approve ? null : new Date(),
        reviewedByAdminId: input.adminUserId,
        notes: input.notes,
        subscriptionActiveUntil: input.subscriptionActiveUntil,
        subscriptionPaymentStatus: input.subscriptionPaymentStatus,
      },
    });
  }

  updateMerchantPlanStatus(
    merchantId: string,
    data: {
      subscriptionPaymentStatus?: "PENDING" | "ACTIVE" | "EXPIRED";
      subscriptionActiveUntil?: Date | null;
      tenOrderCycleCount?: number;
      bamoraFeesOwed?: Prisma.Decimal;
      bamoraFeesPaid?: Prisma.Decimal;
      outstandingBalance?: Prisma.Decimal;
      blockedAt?: Date | null;
      reopenedAt?: Date | null;
    },
  ) {
    return this.prisma.merchantPlan.update({ where: { merchantId }, data });
  }

  listPendingPlanApprovals() {
    return this.prisma.merchantPlan
      .findMany({
        where: { approvalStatus: "PENDING_PLAN_APPROVAL" },
        include: { merchant: { include: { user: true } } },
        orderBy: { requestedAt: "asc" },
      })
      .catch((error) => {
        if (this.isMissingTableError(error)) {
          return [];
        }

        throw error;
      });
  }

  createBamoraCharge(input: {
    merchantId: string;
    orderId: string;
    subOrderId: string;
    planType: "MONTHLY_SUBSCRIPTION" | "BAMORA_COMMISSION" | "TEN_ORDER_LIMIT";
    orderAmount: number;
    bamoraFee: number;
    dueAt?: Date;
  }) {
    return this.prisma.merchantBamoraCharge.create({
      data: {
        merchantId: input.merchantId,
        orderId: input.orderId,
        subOrderId: input.subOrderId,
        planType: input.planType,
        orderAmount: new Prisma.Decimal(input.orderAmount),
        bamoraFee: new Prisma.Decimal(input.bamoraFee),
        remainingAmount: new Prisma.Decimal(input.bamoraFee),
        dueAt: input.dueAt,
      },
    });
  }

  findBamoraChargeBySubOrderId(subOrderId: string) {
    return this.prisma.merchantBamoraCharge.findUnique({ where: { subOrderId } });
  }

  listBamoraCharges() {
    return this.prisma.merchantBamoraCharge.findMany({
      include: { merchant: { include: { user: true } }, order: true, subOrder: true },
      orderBy: { createdAt: "desc" },
    });
  }

  confirmBamoraCharge(chargeId: string, adminUserId: string) {
    return this.prisma.merchantBamoraCharge.update({
      where: { id: chargeId },
      data: {
        paymentStatus: "CONFIRMED",
        remainingAmount: new Prisma.Decimal(0),
        paidAt: new Date(),
        confirmedAt: new Date(),
        confirmedByAdminId: adminUserId,
      },
    });
  }

  markOverdueCharges(now: Date) {
    return this.prisma.merchantBamoraCharge.updateMany({
      where: {
        paymentStatus: "PENDING",
        dueAt: { lt: now },
      },
      data: {
        paymentStatus: "OVERDUE",
      },
    });
  }

  updateSubOrderAttention(
    subOrderId: string,
    attentionState: "NORMAL" | "PENDING_REVIEW" | "PENDING_BAMORA_PAYMENT" | "DELAYED",
    delayedAt?: Date | null,
  ) {
    return this.prisma.merchantSubOrder.update({
      where: { id: subOrderId },
      data: {
        attentionState,
        delayedAt: delayedAt === undefined ? undefined : delayedAt,
      },
    });
  }

  listDelayedSubOrders(now: Date) {
    return this.prisma.merchantSubOrder.findMany({
      where: {
        processByAt: { lt: now },
        delayedAt: null,
        status: { in: ["PENDING", "CONFIRMED", "PACKED"] },
      },
      include: { merchant: { include: { user: true } }, order: true },
    });
  }

  createAdminAlert(input: {
    code: string;
    title: string;
    body: string;
    merchantId?: string;
    orderId?: string;
    level?: string;
  }) {
    return this.prisma.adminAlert.create({
      data: {
        code: input.code,
        title: input.title,
        body: input.body,
        merchantId: input.merchantId,
        orderId: input.orderId,
        level: input.level ?? "warning",
      },
    });
  }

  findOpenAdminAlert(code: string, merchantId?: string, orderId?: string) {
    return this.prisma.adminAlert.findFirst({
      where: {
        code,
        merchantId,
        orderId,
        resolvedAt: null,
      },
    });
  }

  listAdminAlerts(limit = 200) {
    return this.prisma.adminAlert.findMany({
      where: { resolvedAt: null },
      include: { merchant: { include: { user: true } }, order: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  resolveAdminAlert(id: string) {
    return this.prisma.adminAlert.update({ where: { id }, data: { resolvedAt: new Date() } });
  }

  createMerchantActivityLog(input: {
    merchantId: string;
    action: string;
    entityType: string;
    entityId?: string;
    oldValue?: Prisma.InputJsonValue;
    newValue?: Prisma.InputJsonValue;
    details?: string;
  }) {
    return this.prisma.merchantActivityLog
      .create({
        data: {
          merchantId: input.merchantId,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          oldValue: input.oldValue,
          newValue: input.newValue,
          details: input.details,
        },
      })
      .catch((error) => {
        if (this.isMissingTableError(error)) {
          return null;
        }

        throw error;
      });
  }

  listMerchantActivityLogs(merchantId?: string) {
    return this.prisma.merchantActivityLog
      .findMany({
        where: merchantId ? { merchantId } : undefined,
        include: { merchant: { include: { user: true } } },
        orderBy: { createdAt: "desc" },
        take: 500,
      })
      .catch((error) => {
        if (this.isMissingTableError(error)) {
          return [];
        }

        throw error;
      });
  }
}
