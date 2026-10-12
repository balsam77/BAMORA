import { INestApplication, Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { startupFailureMessage, startupStep, startupStepAsync } from "../common/startup-diagnostics";
import { prismaConnectionUrl } from "./connection-config";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const datasourceUrl = startupStep("database-configuration", () => prismaConnectionUrl());
    super({ datasourceUrl });
  }

  async onModuleInit() {
    try {
      await startupStepAsync("database-connection", () => this.$connect());
    } catch (error: unknown) {
      // Startup temporarily suppresses Nest error logging; stderr retains the sanitized failure.
      process.stderr.write(`${startupFailureMessage(error)}\n`);
      throw error;
    }
  }

  async enableShutdownHooks(app: INestApplication) {
    app.enableShutdownHooks();
  }
}
