import { BadRequestException, Body, Controller, Get, Post, Query } from "@nestjs/common";
import { CommerceService } from "../services/commerce.service";
import { GuestCheckoutDto } from "./guest-checkout.dto";

@Controller("api/catalog")
export class CatalogController {
  constructor(private readonly commerceService: CommerceService) {}

  @Get("categories")
  categories() {
    return this.commerceService.listPublicCategories();
  }

  @Get("products")
  products(@Query("q") q?: string) {
    if (q !== undefined && typeof q !== "string") {
      throw new BadRequestException("q must be a string.");
    }
    return this.commerceService.searchProducts({ q: q ?? "" });
  }

  @Get("shipping-zones")
  shippingZones() {
    return this.commerceService.publicShippingZones();
  }

  @Post("checkout")
  checkout(@Body() body: GuestCheckoutDto) {
    return this.commerceService.guestCheckout(body);
  }
}
