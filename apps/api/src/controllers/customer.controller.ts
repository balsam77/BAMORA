import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser, type AuthenticatedUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { CommerceService } from "../services/commerce.service";

@Roles("customer")
@Controller("api/customer")
export class CustomerController {
  constructor(private readonly commerceService: CommerceService) {}

  @Get("dashboard")
  dashboard(@CurrentUser() user: AuthenticatedUser | null, @Query("userId") userId?: string) {
    return this.commerceService.customerDashboard(user ?? undefined, userId);
  }

  @Get("profile")
  async profile(@CurrentUser() user: AuthenticatedUser | null, @Query("userId") userId?: string) {
    const dashboard = await this.commerceService.customerDashboard(user ?? undefined, userId);
    return dashboard.profile;
  }

  @Get("addresses")
  async addresses(@CurrentUser() user: AuthenticatedUser | null, @Query("userId") userId?: string) {
    const dashboard = await this.commerceService.customerDashboard(user ?? undefined, userId);
    return dashboard.addresses;
  }

  @Post("addresses")
  upsertAddress(
    @CurrentUser() user: AuthenticatedUser | null,
    @Query("userId") userId: string | undefined,
    @Body() body: { id?: string; label: string; line1: string; city: string; isDefault: boolean },
  ) {
    return this.commerceService.upsertAddress(body, user ?? undefined, userId);
  }

  @Get("favorites")
  async favorites(@CurrentUser() user: AuthenticatedUser | null, @Query("userId") userId?: string) {
    const dashboard = await this.commerceService.customerDashboard(user ?? undefined, userId);
    return dashboard.favorites;
  }

  @Post("favorites/:productId/toggle")
  toggleFavorite(
    @CurrentUser() user: AuthenticatedUser | null,
    @Query("userId") userId: string | undefined,
    @Param("productId") productId: string,
  ) {
    return this.commerceService.toggleFavorite(productId, user ?? undefined, userId);
  }

  @Get("cart")
  async cart(@CurrentUser() user: AuthenticatedUser | null, @Query("userId") userId?: string) {
    const dashboard = await this.commerceService.customerDashboard(user ?? undefined, userId);
    return dashboard.cart;
  }

  @Post("cart")
  addToCart(
    @CurrentUser() user: AuthenticatedUser | null,
    @Query("userId") userId: string | undefined,
    @Body() body: { productId: string; quantity: number; size: string; color: string },
  ) {
    return this.commerceService.addToCart(body, user ?? undefined, userId);
  }

  @Delete("cart/:itemId")
  async removeCartItem(
    @CurrentUser() user: AuthenticatedUser | null,
    @Query("userId") userId: string | undefined,
    @Param("itemId") itemId: string,
  ) {
    return { deleted: await this.commerceService.removeCartItem(itemId, user ?? undefined, userId) };
  }

  @Post("checkout")
  checkout(@CurrentUser() user: AuthenticatedUser | null, @Query("userId") userId?: string) {
    return this.commerceService.checkout(user ?? undefined, userId);
  }

  @Get("orders")
  orders(@CurrentUser() user: AuthenticatedUser | null, @Query("userId") userId?: string) {
    return this.commerceService.listCustomerOrders(user ?? undefined, userId);
  }

  @Patch("orders/:id/cancel")
  cancelOrder(
    @CurrentUser() user: AuthenticatedUser | null,
    @Query("userId") userId: string | undefined,
    @Param("id") id: string,
  ) {
    return this.commerceService.cancelOrder(id, user ?? undefined, userId);
  }

  @Patch("orders/:id/return")
  returnOrder(
    @CurrentUser() user: AuthenticatedUser | null,
    @Query("userId") userId: string | undefined,
    @Param("id") id: string,
    @Body() body: { reason?: string },
  ) {
    return this.commerceService.requestReturn(id, body.reason, user ?? undefined, userId);
  }

  @Get("notifications")
  notifications(@CurrentUser() user: AuthenticatedUser | null, @Query("userId") userId?: string) {
    return this.commerceService.listCustomerNotifications(user ?? undefined, userId);
  }

  @Patch("notifications/:id/read")
  readNotification(@CurrentUser() user: AuthenticatedUser | null, @Param("id") id: string) {
    return this.commerceService.markNotificationRead(id, user ?? undefined);
  }

  @Post("reviews")
  submitReview(
    @CurrentUser() user: AuthenticatedUser | null,
    @Query("userId") userId: string | undefined,
    @Body() body: { productId: string; rating: number; comment?: string },
  ) {
    return this.commerceService.submitReview(body, user ?? undefined, userId);
  }

  @Get("search")
  search(
    @Query("q") q = "",
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string,
    @Query("color") color?: string,
    @Query("size") size?: string,
    @Query("categoryId") categoryId?: string,
    @Query("sort") sort?: "price_asc" | "price_desc" | "newest",
  ) {
    return this.commerceService.searchProducts({
      q,
      minPrice: minPrice != null ? Number(minPrice) : undefined,
      maxPrice: maxPrice != null ? Number(maxPrice) : undefined,
      color,
      size,
      categoryId,
      sort,
    });
  }
}
