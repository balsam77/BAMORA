import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser, type AuthenticatedUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { CommerceService } from "../services/commerce.service";

@Roles("merchant")
@Controller("api/merchant")
export class MerchantController {
  constructor(private readonly commerceService: CommerceService) {}

  @Get("dashboard")
  dashboard(@CurrentUser() user: AuthenticatedUser | null, @Query("merchantId") merchantId?: string) {
    return this.commerceService.merchantDashboard(user ?? undefined, merchantId);
  }

  @Get("products")
  async products(@CurrentUser() user: AuthenticatedUser | null, @Query("merchantId") merchantId?: string) {
    const dashboard = await this.commerceService.merchantDashboard(user ?? undefined, merchantId);
    return dashboard.products;
  }

  @Post("products")
  createProduct(
    @CurrentUser() user: AuthenticatedUser | null,
    @Body() body: { merchantId: string; name: string; stock: number; price: string; images: string[]; sizes: string[]; colors: string[] },
  ) {
    return this.commerceService.merchantUpsertProduct(body, user ?? undefined);
  }

  @Patch("products/:id")
  updateProduct(
    @CurrentUser() user: AuthenticatedUser | null,
    @Param("id") id: string,
    @Body() body: { merchantId: string; name: string; stock: number; price: string; images: string[]; sizes: string[]; colors: string[] },
  ) {
    return this.commerceService.merchantUpsertProduct({ id, ...body }, user ?? undefined);
  }

  @Delete("products/:id")
  async deleteProduct(
    @CurrentUser() user: AuthenticatedUser | null,
    @Query("merchantId") merchantId: string | undefined,
    @Param("id") id: string,
  ) {
    return { deleted: await this.commerceService.merchantDeleteProduct(id, user ?? undefined, merchantId) };
  }

  @Get("orders")
  async orders(@CurrentUser() user: AuthenticatedUser | null, @Query("merchantId") merchantId?: string) {
    const dashboard = await this.commerceService.merchantDashboard(user ?? undefined, merchantId);
    return dashboard.orders;
  }

  @Patch("orders/:id/status")
  updateOrderStatus(
    @CurrentUser() user: AuthenticatedUser | null,
    @Query("merchantId") merchantId: string | undefined,
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

    return this.commerceService.merchantUpdateOrderStatus(id, statusMap[body.status], user ?? undefined, merchantId);
  }

  @Patch("orders/:id/shipping")
  updateShipment(
    @CurrentUser() user: AuthenticatedUser | null,
    @Query("merchantId") merchantId: string | undefined,
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
      merchantId,
    );
  }

  @Post("coupons")
  createCoupon(@Body() body: { title: string; code?: string; discountText: string }) {
    return this.commerceService.createOffer(body);
  }

  @Get("inventory/alerts")
  async inventoryAlerts(@CurrentUser() user: AuthenticatedUser | null, @Query("merchantId") merchantId?: string) {
    const dashboard = await this.commerceService.merchantDashboard(user ?? undefined, merchantId);
    return dashboard.inventory;
  }
}
