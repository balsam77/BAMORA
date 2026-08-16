import { Injectable } from "@nestjs/common";

type Role = "customer" | "merchant" | "super-admin";

type UserStatus = "active" | "suspended";
type TicketStatus = "open" | "in_progress" | "resolved";

type MerchantStatus = "pending" | "approved" | "rejected" | "suspended";
type OrderStatus = "new" | "preparing" | "shipped" | "delivered" | "canceled";

@Injectable()
export class MockDataService {
  private users = [
    { id: "usr-1", name: "Customer Demo", email: "customer@bamora.com", password: "123456", role: "customer" as Role, status: "active" as UserStatus },
    { id: "usr-2", name: "Merchant Demo", email: "merchant@bamora.com", password: "123456", role: "merchant" as Role, status: "active" as UserStatus },
    { id: "usr-3", name: "Admin Demo", email: "admin@bamora.com", password: "123456", role: "super-admin" as Role, status: "active" as UserStatus },
  ];

  private merchants = [
    { id: "mer-1", name: "Atelier Noir", status: "approved" as MerchantStatus, orders: 110, revenue: "182000" },
    { id: "mer-2", name: "Golden Stitch", status: "pending" as MerchantStatus, orders: 0, revenue: "0" },
  ];

  private products = [
    { id: "prd-1", merchantId: "mer-1", name: "Velvet Dress", stock: 24, price: "620", images: ["/uploads/prd-1-main.jpg"], sizes: ["S", "M"], colors: ["black"] },
    { id: "prd-2", merchantId: "mer-1", name: "Leather Bag", stock: 15, price: "799", images: ["/uploads/prd-2-main.jpg"], sizes: ["one-size"], colors: ["brown"] },
  ];

  private orders = [
    { id: "ord-1", merchantId: "mer-1", customerId: "usr-1", status: "new" as OrderStatus, total: "1099" },
    { id: "ord-2", merchantId: "mer-1", customerId: "usr-1", status: "shipped" as OrderStatus, total: "799" },
  ];

  private categories = [
    { id: "cat-1", nameAr: "نسائي", slug: "women", icon: "women", parentId: null as string | null },
    { id: "cat-2", nameAr: "فساتين", slug: "dresses", icon: "dress", parentId: "cat-1" },
  ];

  private offers = [
    { id: "off-1", title: "Summer Offer", code: "BAMORA10", discountText: "10% off", createdAt: new Date().toISOString() },
  ];

  private broadcasts = [
    { id: "bc-1", audience: "all-users", title: "Platform Update", body: "Performance improved", sentAt: new Date().toISOString() },
  ];

  private supportTickets = [
    { id: "sup-1", userName: "Customer Demo", subject: "Late order update", status: "open" as TicketStatus, assignedTo: null as string | null, createdAt: new Date().toISOString() },
  ];

  private addresses = [
    { id: "addr-1", userId: "usr-1", label: "Home", line1: "Main st 15", city: "Jerusalem", isDefault: true },
  ];

  private favorites: Record<string, string[]> = { "usr-1": ["prd-1"] };
  private carts: Record<string, Array<{ id: string; productId: string; quantity: number; size: string; color: string }>> = { "usr-1": [] };

  health() {
    return { ok: true, service: "bamora-api", time: new Date().toISOString() };
  }

  signup(payload: { name: string; email: string; password: string; role?: Role }) {
    const exists = this.users.some((u) => u.email.toLowerCase() === payload.email.toLowerCase());
    if (exists) {
      throw new Error("Email already exists");
    }

    const user = {
      id: `usr-${Date.now()}`,
      name: payload.name,
      email: payload.email,
      password: payload.password,
      role: payload.role ?? "customer",
      status: "active" as UserStatus,
    };
    this.users.unshift(user);
    return { token: `mock-token-${user.id}`, user: { ...user, password: undefined } };
  }

  login(payload: { email: string; password: string }) {
    const user = this.users.find((item) => item.email.toLowerCase() === payload.email.toLowerCase());
    if (!user || user.password !== payload.password) {
      throw new Error("Invalid credentials");
    }

    if (user.status === "suspended") {
      throw new Error("Account suspended");
    }

    return { token: `mock-token-${user.id}`, user: { ...user, password: undefined } };
  }

  listMerchants() {
    return this.merchants;
  }

  updateMerchantStatus(id: string, status: MerchantStatus) {
    const target = this.merchants.find((item) => item.id === id);
    if (!target) {
      return null;
    }

    target.status = status;
    return target;
  }

  deleteMerchant(id: string) {
    const before = this.merchants.length;
    this.merchants = this.merchants.filter((item) => item.id !== id);
    return before !== this.merchants.length;
  }

  listProducts() {
    return this.products;
  }

  upsertProduct(input: {
    id?: string;
    merchantId: string;
    name: string;
    stock: number;
    price: string;
    images: string[];
    sizes: string[];
    colors: string[];
  }) {
    if (input.id) {
      const existing = this.products.find((item) => item.id === input.id);
      if (existing) {
        existing.merchantId = input.merchantId;
        existing.name = input.name;
        existing.stock = input.stock;
        existing.price = input.price;
        existing.images = input.images;
        existing.sizes = input.sizes;
        existing.colors = input.colors;
        return existing;
      }
    }

    const created = {
      id: `prd-${Date.now()}`,
      merchantId: input.merchantId,
      name: input.name,
      stock: input.stock,
      price: input.price,
      images: input.images,
      sizes: input.sizes,
      colors: input.colors,
    };
    this.products.unshift(created);
    return created;
  }

  deleteProduct(id: string) {
    const before = this.products.length;
    this.products = this.products.filter((item) => item.id !== id);
    return before !== this.products.length;
  }

  listOrders() {
    return this.orders;
  }

  updateOrderStatus(id: string, status: OrderStatus) {
    const target = this.orders.find((item) => item.id === id);
    if (!target) {
      return null;
    }

    target.status = status;
    return target;
  }

  listCategories() {
    return this.categories;
  }

  upsertCategory(input: { id?: string; nameAr: string; slug: string; icon: string; parentId: string | null }) {
    if (input.id) {
      const existing = this.categories.find((item) => item.id === input.id);
      if (existing) {
        existing.nameAr = input.nameAr;
        existing.slug = input.slug;
        existing.icon = input.icon;
        existing.parentId = input.parentId;
        return existing;
      }
    }

    const created = {
      id: `cat-${Date.now()}`,
      nameAr: input.nameAr,
      slug: input.slug,
      icon: input.icon,
      parentId: input.parentId,
    };
    this.categories.unshift(created);
    return created;
  }

  deleteCategory(id: string) {
    const before = this.categories.length;
    this.categories = this.categories.filter((item) => item.id !== id);
    return before !== this.categories.length;
  }

  createOffer(input: { title: string; code?: string; discountText: string }) {
    const offer = {
      id: `off-${Date.now()}`,
      title: input.title,
      code: input.code ?? "",
      discountText: input.discountText,
      createdAt: new Date().toISOString(),
    };
    this.offers.unshift(offer);
    return offer;
  }

  sendBroadcast(input: { audience: "all-users" | "customers" | "merchants"; title: string; body: string }) {
    const record = { id: `bc-${Date.now()}`, audience: input.audience, title: input.title, body: input.body, sentAt: new Date().toISOString() };
    this.broadcasts.unshift(record);
    return record;
  }

  listUsers() {
    return this.users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status }));
  }

  updateUserStatus(id: string, status: UserStatus) {
    const target = this.users.find((item) => item.id === id);
    if (!target) {
      return null;
    }

    target.status = status;
    return { id: target.id, name: target.name, email: target.email, role: target.role, status: target.status };
  }

  deleteUser(id: string) {
    const before = this.users.length;
    this.users = this.users.filter((item) => item.id !== id);
    return before !== this.users.length;
  }

  listSupportTickets() {
    return this.supportTickets;
  }

  assignSupportTicket(id: string, assignedTo: string) {
    const target = this.supportTickets.find((item) => item.id === id);
    if (!target) {
      return null;
    }

    target.assignedTo = assignedTo;
    target.status = target.status === "open" ? "in_progress" : target.status;
    return target;
  }

  updateSupportTicketStatus(id: string, status: TicketStatus) {
    const target = this.supportTickets.find((item) => item.id === id);
    if (!target) {
      return null;
    }

    target.status = status;
    return target;
  }

  adminDashboard() {
    return {
      merchants: this.merchants,
      products: this.products,
      orders: this.orders,
      categories: this.categories,
      users: this.listUsers(),
      supportTickets: this.supportTickets,
      offers: this.offers,
      broadcasts: this.broadcasts,
      stats: {
        merchantCount: this.merchants.length,
        dailyOrders: this.orders.length,
        monthlyOrders: this.orders.length * 17,
        platformRevenue: "1920300",
      },
    };
  }

  customerDashboard(userId: string) {
    const user = this.users.find((item) => item.id === userId);
    return {
      profile: {
        id: user?.id ?? "usr-1",
        fullName: user?.name ?? "Customer Demo",
        email: user?.email ?? "customer@bamora.com",
      },
      addresses: this.addresses.filter((a) => a.userId === userId),
      products: this.products,
      favorites: this.favorites[userId] ?? [],
      cart: this.carts[userId] ?? [],
      orders: this.orders.filter((o) => o.customerId === userId),
    };
  }

  toggleFavorite(userId: string, productId: string) {
    const current = this.favorites[userId] ?? [];
    if (current.includes(productId)) {
      this.favorites[userId] = current.filter((item) => item !== productId);
    } else {
      this.favorites[userId] = [productId, ...current];
    }
    return this.favorites[userId];
  }

  addToCart(userId: string, payload: { productId: string; quantity: number; size: string; color: string }) {
    const current = this.carts[userId] ?? [];
    const item = {
      id: `cart-${Date.now()}`,
      productId: payload.productId,
      quantity: payload.quantity,
      size: payload.size,
      color: payload.color,
    };
    this.carts[userId] = [item, ...current];
    return item;
  }

  removeCartItem(userId: string, itemId: string) {
    const current = this.carts[userId] ?? [];
    const before = current.length;
    this.carts[userId] = current.filter((item) => item.id !== itemId);
    return before !== this.carts[userId].length;
  }

  checkout(userId: string) {
    const cart = this.carts[userId] ?? [];
    if (!cart[0]) {
      return null;
    }

    const order = {
      id: `ord-${Date.now()}`,
      merchantId: "mer-1",
      customerId: userId,
      status: "new" as OrderStatus,
      total: "500",
    };
    this.orders.unshift(order);
    this.carts[userId] = [];
    return order;
  }

  upsertAddress(userId: string, input: { id?: string; label: string; line1: string; city: string; isDefault: boolean }) {
    if (input.id) {
      const existing = this.addresses.find((item) => item.id === input.id && item.userId === userId);
      if (existing) {
        existing.label = input.label;
        existing.line1 = input.line1;
        existing.city = input.city;
        existing.isDefault = input.isDefault;
        return existing;
      }
    }

    const created = {
      id: `addr-${Date.now()}`,
      userId,
      label: input.label,
      line1: input.line1,
      city: input.city,
      isDefault: input.isDefault,
    };
    this.addresses.unshift(created);
    return created;
  }

  submitReview(payload: { productId: string; rating: number; comment?: string }) {
    return {
      id: `rev-${Date.now()}`,
      productId: payload.productId,
      rating: payload.rating,
      comment: payload.comment ?? "",
      createdAt: new Date().toISOString(),
    };
  }

  uploadImage(payload: { filename: string; mimeType?: string }) {
    return {
      id: `img-${Date.now()}`,
      filename: payload.filename,
      mimeType: payload.mimeType ?? "image/jpeg",
      url: `/uploads/${payload.filename}`,
      provider: "local-mock",
    };
  }

  integrationConfig() {
    return {
      payment: {
        provider: "placeholder",
        status: "not_connected",
        nextStep: "Set PAYMENT_PROVIDER and credentials in env",
      },
      shipping: {
        provider: "placeholder",
        status: "not_connected",
        nextStep: "Set SHIPPING_PROVIDER and credentials in env",
      },
      webhooks: {
        paymentWebhook: "/api/integrations/webhooks/payment",
        shippingWebhook: "/api/integrations/webhooks/shipping",
      },
    };
  }
}
