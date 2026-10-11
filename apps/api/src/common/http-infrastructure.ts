import { NestExpressApplication } from "@nestjs/platform-express";
import { mkdir, access } from "fs/promises";
import { constants } from "fs";
import { getCorsOrigins, getUploadsDirectory, localUploadsEnabled } from "./deployment-config";

export async function configureHttpInfrastructure(app: NestExpressApplication) {
  const origins = getCorsOrigins();
  app.enableCors({ origin: origins });
  if (!localUploadsEnabled()) return;
  const uploadsDirectory = getUploadsDirectory();
  await mkdir(uploadsDirectory, { recursive: true });
  await access(uploadsDirectory, constants.W_OK);
  app.useStaticAssets(uploadsDirectory, { prefix: "/uploads/" });
}
