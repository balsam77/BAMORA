import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser, type AuthenticatedUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { CommerceService } from "../services/commerce.service";
import { MerchantProductDto } from "./merchant-product.dto";

@Roles("merchant")
@Controller("api/merchant")
export class MerchantController {
  constructor(private readonly commerceService: CommerceService) {}

  @Get("dashboard")
  dashboard(@CurrentUser() user: AuthenticatedUser | null) {
    return this.commerceService.merchantDashboard(user ?? undefined);
  }

  @Get("products")
  async products(@CurrentUser() user: AuthenticatedUser | null) {
    const dashboard = await this.commerceService.merchantDashboard(user ?? undefined);
    return dashboard.products;
  }

  @Post("products")
  createProduct(
    @CurrentUser() user: AuthenticatedUser | null,
    @Body() body: MerchantProductDto,
  ) {
    return this.commerceService.merchantUpsertProduct(body, user ?? undefined);
  }

  @Patch("products/:id")
  updateProduct(
    @CurrentUser() user: AuthenticatedUser | null,
    @Param("id") id: string,
    @Body() body: MerchantProductDto,
  ) {
    return this.commerceService.merchantUpsertProduct({ ...body, id }, user ?? undefined);
  }

  @Delete("products/:id")
  async deleteProduct(@CurrentUser() user: AuthenticatedUser | null, @Param("id") id: string) {
    return { deleted: await this.commerceService.merchantDeleteProduct(id, user ?? undefined) };
  }

  @Get("orders")
  async orders(@CurrentUser() user: AuthenticatedUser | null) {
    const dashboard = await this.commerceService.merchantDashboard(user ?? undefined);
    return dashboard.orders;
  }

  @Patch("orders/:id/status")
  updateOrderStatus(
    @CurrentUser() user: AuthenticatedUser | null,
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

    return this.commerceService.merchantUpdateOrderStatus(id, statusMap[body.status], user ?? undefined);
  }

  @Patch("orders/:id/shipping")
  updateShipment(
    @CurrentUser() user: AuthenticatedUser | null,
    @Param("id") id: string,
    @Body() body: { carrierCode: string; trackingNumber: string; shippingCost: number; status: "PENDING" | "LABEL_CREATED" | "IN_TRANSIT" | "DELIVERED" | "RETURNED" | "EXCEPTION" | "CANCELLED" },
  ) {
    return this.commerceService.updateShipmentForMerchant(
      {
        orderId: id,
        carrierCode: body.carrierCode,
        trackingNumber: body.trackingNumber,
        shippingCost: body.shippingCost,
        status: body.status,
      },
      user ?? undefined,
    );
  }

  @Post("coupons")
  createCoupon(@Body() body: { title: string; code?: string; discountText: string }) {
    return this.commerceService.createOffer(body);
  }

  @Get("coupons")
  listCoupons() {
    return this.commerceService.listCoupons();
  }

  @Get("inventory/alerts")
  async inventoryAlerts(@CurrentUser() user: AuthenticatedUser | null) {
    const dashboard = await this.commerceService.merchantDashboard(user ?? undefined);
    return dashboard.inventory;
  }

  @Get("plan")
  plan(@CurrentUser() user: AuthenticatedUser | null) {
    return this.commerceService.getMerchantPlan(user ?? undefined);
  }

  @Post("plan")
  requestPlan(
    @CurrentUser() user: AuthenticatedUser | null,
    @Body() body: { plan: "monthly_subscription" | "bamora_commission" | "ten_order_limit" },
  ) {
    return this.commerceService.requestMerchantPlan(body.plan, user ?? undefined);
  }
}
