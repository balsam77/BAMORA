import { Controller, Get } from "@nestjs/common";
import { CommerceService } from "../services/commerce.service";

@Controller("api/catalog")
export class CatalogController {
  constructor(private readonly commerceService: CommerceService) {}

  @Get("categories")
  categories() {
    return this.commerceService.listPublicCategories();
  }
}
