import { Injectable } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CommerceRepository {
  constructor(private readonly prisma: PrismaService) {}

  get db() {
    return this.prisma;
  }

  runInTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(callback);
  }

  findUserById(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  findCustomerByUserId(userId: string) {
    return this.prisma.customer.findUnique({ where: { userId } });
  }

  findMerchantByUserId(userId: string) {
    return this.prisma.merchant.findUnique({ where: { userId } });
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
                product: true,
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
    return this.prisma.order.findMany({
      where: { customerId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
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
    });
  }

  listOrdersForMerchant(merchantId: string) {
    return this.prisma.merchantSubOrder.findMany({
      where: { merchantId },
      include: {
        order: {
          include: {
            customer: {
              include: {
                user: true,
              },
            },
            payment: true,
          },
        },
        items: {
          include: {
            orderItem: {
              include: {
                variant: {
                  include: {
                    product: true,
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
      },
      orderBy: { createdAt: "desc" },
    });
  }

  listAllOrders() {
    return this.prisma.order.findMany({
      include: {
        customer: { include: { user: true } },
        payment: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
        subOrders: {
          include: {
            merchant: true,
            shipment: { include: { carrier: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  listMerchants() {
    return this.prisma.merchant.findMany({ include: { user: true }, orderBy: { createdAt: "desc" } });
  }

  updateMerchantStatus(id: string, status: "PENDING" | "APPROVED" | "SUSPENDED") {
    return this.prisma.merchant.update({ where: { id }, data: { status } });
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
      return this.prisma.product.update({
        where: { id: input.id },
        data: {
          titleAr: input.name,
          titleEn: input.name,
          descriptionAr: input.name,
          descriptionEn: input.name,
          status: "PUBLISHED",
        },
        include: {
          variants: { include: { inventory: true } },
          images: true,
        },
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
}
