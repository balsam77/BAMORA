import { NestExpressApplication } from "@nestjs/platform-express";
import { mkdir, access } from "fs/promises";
import { constants } from "fs";
import { getCorsOrigins, getUploadsDirectory } from "./deployment-config";

export async function configureHttpInfrastructure(app: NestExpressApplication) {
  const origins = getCorsOrigins();
  const uploadsDirectory = getUploadsDirectory();
  await mkdir(uploadsDirectory, { recursive: true });
  await access(uploadsDirectory, constants.W_OK);
  app.enableCors({ origin: origins });
  app.useStaticAssets(uploadsDirectory, { prefix: "/uploads/" });
}
