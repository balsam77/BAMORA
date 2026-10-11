import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { PrismaService } from "./prisma/prisma.service";
import { getPort, paymentsEnabled } from "./common/deployment-config";
import { configureHttpInfrastructure } from "./common/http-infrastructure";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  paymentsEnabled();
  await configureHttpInfrastructure(app);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  await app.listen(getPort(), "0.0.0.0");
}

void bootstrap().catch(() => {
  Logger.error("API startup failed. Check database connectivity, JWT_SECRET, CORS_ORIGINS, PORT and UPLOAD_DIR.", "Bootstrap");
  process.exitCode = 1;
});
