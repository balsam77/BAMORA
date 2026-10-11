import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser, type AuthenticatedUser } from "../common/current-user.decorator";
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
  updateMerchantStatus(@Param("id") id: string, @Body() body: { status: "pending" | "active" | "rejected" | "suspended" }) {
    return this.commerceService.updateMerchantStatus(id, body.status);
  }

  @Get("merchants/pending-plan-approvals")
  pendingPlanApprovals() {
    return this.commerceService.listPendingPlanApprovals();
  }

  @Patch("merchants/:id/plan")
  reviewMerchantPlan(
    @CurrentUser() user: AuthenticatedUser | null,
    @Param("id") merchantId: string,
    @Body() body: {
      decision: "approve" | "reject";
      notes?: string;
      subscriptionMonths?: number;
      subscriptionPaymentStatus?: "pending" | "active" | "expired";
    },
  ) {
    return this.commerceService.reviewMerchantPlan(
      merchantId,
      {
        decision: body.decision,
        notes: body.notes,
        subscriptionMonths: body.subscriptionMonths,
        subscriptionPaymentStatus: body.subscriptionPaymentStatus,
      },
      user ?? undefined,
    );
  }

  @Patch("merchants/:id/reopen")
  reopenMerchant(@Param("id") merchantId: string) {
    return this.commerceService.reopenMerchantAfterPayment(merchantId);
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

  @Get("orders/delayed")
  delayedOrders() {
    return this.commerceService.listDelayedOrders();
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

  @Get("payments/bamora")
  bamoraPayments() {
    return this.commerceService.listBamoraCharges();
  }

  @Patch("payments/bamora/:id/confirm")
  confirmBamoraPayment(
    @CurrentUser() user: AuthenticatedUser | null,
    @Param("id") id: string,
  ) {
    return this.commerceService.confirmBamoraCharge(id, user ?? undefined);
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

  @Get("alerts")
  alerts() {
    return this.commerceService.listAdminAlerts();
  }

  @Patch("alerts/:id/resolve")
  resolveAlert(@Param("id") id: string) {
    return this.commerceService.resolveAdminAlert(id);
  }

  @Get("activity/merchants")
  merchantActivity() {
    return this.commerceService.listMerchantActivity();
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
