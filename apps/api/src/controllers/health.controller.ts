import { Controller, Get } from "@nestjs/common";

@Controller("api/health")
export class HealthController {
  @Get()
  health() {
    return {
      status: "ok",
      service: "bamora-api",
      timestamp: new Date().toISOString(),
    };
  }
}
