import { CanActivate, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { localUploadsEnabled } from "./deployment-config";

@Injectable()
export class UploadStorageGuard implements CanActivate {
  canActivate() {
    if (!localUploadsEnabled()) {
      throw new ServiceUnavailableException("File uploads are temporarily unavailable. Persistent storage is not configured.");
    }
    return true;
  }
}
