import { Body, Controller, Get, Post } from "@nestjs/common";
import { Roles } from "../common/roles.decorator";
import { CommerceService } from "../services/commerce.service";

@Controller("api/integrations")
export class IntegrationsController {
  constructor(private readonly commerceService: CommerceService) {}

  @Roles("super-admin")
  @Get("config")
  config() {
    return this.commerceService.integrationsConfig();
  }

  @Post("webhooks/payment")
  paymentWebhook(@Body() body: Record<string, unknown>) {
    return {
      accepted: true,
      type: "payment",
      payload: body,
      receivedAt: new Date().toISOString(),
    };
  }

  @Post("webhooks/shipping")
  shippingWebhook(@Body() body: Record<string, unknown>) {
    return {
      accepted: true,
      type: "shipping",
      payload: body,
      receivedAt: new Date().toISOString(),
    };
  }
}
