import { Controller, Get, Logger, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("api/health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  health() {
    return {
      status: "ok",
      service: "bamora-api",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("ready")
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      this.logger.error("Database readiness check failed.");
      throw new ServiceUnavailableException("Database is unavailable.");
    }
    return { status: "ok", service: "bamora-api", database: "connected" };
  }
}
