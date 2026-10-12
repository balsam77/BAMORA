import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { PrismaService } from "./prisma/prisma.service";
import { getJwtSecret, getPort, paymentsEnabled } from "./common/deployment-config";
import { configureHttpInfrastructure } from "./common/http-infrastructure";
import { startupFailureMessage, startupStep, startupStepAsync } from "./common/startup-diagnostics";

async function bootstrap() {
  startupStep("jwt-initialization", () => getJwtSecret());
  const app = await startupStepAsync("application-initialization", () =>
    NestFactory.create<NestExpressApplication>(AppModule, {
      abortOnError: false,
      logger: ["log", "warn"],
    }),
  );
  startupStep("configuration", () => paymentsEnabled());
  await startupStepAsync("configuration", () => configureHttpInfrastructure(app));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  const port = startupStep("configuration", () => getPort());
  await startupStepAsync("application-initialization", () => app.init());
  await startupStepAsync("http-listen", () => app.listen(port, "0.0.0.0"));
  app.useLogger(new Logger());
}

void bootstrap().catch((error: unknown) => {
  Logger.overrideLogger(["log", "error", "warn", "debug", "verbose", "fatal"]);
  Logger.error(startupFailureMessage(error), "Bootstrap");
  process.exitCode = 1;
});
