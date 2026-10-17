import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { CommerceService } from "../services/commerce.service";

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
}
