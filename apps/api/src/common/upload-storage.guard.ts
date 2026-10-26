import { CanActivate, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { supabaseStorageConfig, uploadStorageMode } from "./deployment-config";

@Injectable()
export class UploadStorageGuard implements CanActivate {
  canActivate() {
    const mode = uploadStorageMode();
    if (mode === "disabled") {
      throw new ServiceUnavailableException("File uploads are temporarily unavailable. Persistent storage is not configured.");
    }
    if (mode === "supabase") supabaseStorageConfig();
    return true;
  }
}
