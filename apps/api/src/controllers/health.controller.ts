import { Controller, Get, Logger, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { databaseReadinessQuery } from "../prisma/database-readiness";

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
      await this.prisma.$queryRawUnsafe(databaseReadinessQuery);
    } catch {
      this.logger.error("Database readiness check failed: connectivity, schema or read permissions are unavailable.");
      throw new ServiceUnavailableException("Database is unavailable or its schema is incompatible.");
    }
    return { status: "ok", service: "bamora-api", database: "connected" };
  }
}
