import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { Roles } from "../common/roles.decorator";
import { CommerceService } from "../services/commerce.service";

@Roles("super-admin")
@Controller("api/admin")
export class AdminController {
  constructor(private readonly commerceService: CommerceService) {}

  @Get("dashboard")
  dashboard() {
    return this.commerceService.adminDashboard();
  }

  @Get("merchants")
  merchants() {
    return this.commerceService.listMerchants();
  }

  @Patch("merchants/:id/status")
  updateMerchantStatus(@Param("id") id: string, @Body() body: { status: "pending" | "approved" | "suspended" }) {
    return this.commerceService.updateMerchantStatus(id, body.status);
  }

  @Delete("merchants/:id")
  async deleteMerchant(@Param("id") id: string) {
    return { deleted: await this.commerceService.deleteMerchant(id) };
  }

  @Get("products")
  products() {
    return this.commerceService.listAdminProducts();
  }

  @Post("products")
  createOrUpdateProduct(@Body() body: { id?: string; merchantId: string; name: string; stock: number; price: string; images: string[]; sizes: string[]; colors: string[] }) {
    return this.commerceService.adminUpsertProduct(body);
  }

  @Delete("products/:id")
  async deleteProduct(@Param("id") id: string) {
    return { deleted: await this.commerceService.adminDeleteProduct(id) };
  }

  @Get("orders")
  orders() {
    return this.commerceService.listAdminOrders();
  }

  @Patch("orders/:id/status")
  updateOrderStatus(
    @Param("id") id: string,
    @Body() body: { status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "canceled" | "return_requested" | "returned" },
  ) {
    const statusMap = {
      pending: "PENDING",
      confirmed: "CONFIRMED",
      processing: "PROCESSING",
      shipped: "SHIPPED",
      delivered: "DELIVERED",
      canceled: "CANCELLED",
      return_requested: "RETURN_REQUESTED",
      returned: "RETURNED",
    } as const;

    return this.commerceService.adminUpdateOrderStatus(id, statusMap[body.status]);
  }

  @Post("orders/:id/payment")
  createOrderPayment(@Param("id") id: string) {
    return this.commerceService.createPaymentForOrder(id);
  }

  @Patch("orders/:id/payment-status")
  updatePaymentStatus(
    @Param("id") id: string,
    @Body() body: { status: "PENDING" | "PAID" | "FAILED" | "REFUNDED" },
  ) {
    return this.commerceService.markPaymentStatus(id, body.status);
  }

  @Post("orders/:id/refund")
  refundOrder(@Param("id") id: string, @Body() body: { reason?: string }) {
    return this.commerceService.refundOrder(id, body.reason);
  }

  @Get("categories")
  categories() {
    return this.commerceService.listCategories();
  }

  @Post("categories")
  upsertCategory(@Body() body: { id?: string; nameAr: string; slug: string; icon: string; parentId: string | null }) {
    return this.commerceService.upsertCategory(body);
  }

  @Delete("categories/:id")
  async deleteCategory(@Param("id") id: string) {
    return { deleted: await this.commerceService.deleteCategory(id) };
  }

  @Post("offers")
  offers(@Body() body: { title: string; code?: string; discountText: string }) {
    return this.commerceService.createOffer(body);
  }

  @Post("broadcasts")
  broadcasts(@Body() body: { audience: "all-users" | "customers" | "merchants"; title: string; body: string }) {
    return this.commerceService.sendBroadcast(body);
  }

  @Get("users")
  users() {
    return this.commerceService.listUsers();
  }

  @Patch("users/:id/status")
  updateUserStatus(@Param("id") id: string, @Body() body: { status: "active" | "suspended" }) {
    return this.commerceService.updateUserStatus(id, body.status);
  }

  @Delete("users/:id")
  async deleteUser(@Param("id") id: string) {
    return { deleted: await this.commerceService.deleteUser(id) };
  }

  @Get("support-tickets")
  supportTickets() {
    return this.commerceService.listSupportTickets();
  }

  @Patch("support-tickets/:id/assign")
  assignTicket(@Param("id") id: string, @Body() body: { assignedTo: string }) {
    return this.commerceService.assignSupportTicket(id, body.assignedTo);
  }

  @Patch("support-tickets/:id/status")
  updateTicketStatus(@Param("id") id: string, @Body() body: { status: "open" | "in_progress" | "resolved" }) {
    return this.commerceService.updateSupportTicketStatus(id, body.status);
  }

  @Get("shipping/carriers")
  carriers() {
    return this.commerceService.listShippingCarriers();
  }

  @Post("shipping/carriers")
  upsertCarrier(@Body() body: { id?: string; code: string; name: string; active?: boolean; apiBaseUrl?: string }) {
    return this.commerceService.upsertShippingCarrier(body);
  }
}
