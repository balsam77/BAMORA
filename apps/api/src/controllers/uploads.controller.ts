import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { Roles } from "../common/roles.decorator";
import { storeProductImage } from "../services/image-storage";
import { UploadStorageGuard } from "../common/upload-storage.guard";

@Roles("merchant", "super-admin")
@Controller("api/uploads")
@UseGuards(UploadStorageGuard)
export class UploadsController {
  @Post("images")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("File is required.");
    }

    const stored = await storeProductImage(file);
    return {
      id: stored.filename,
      ...stored,
      mimeType: file.mimetype,
      size: file.size,
    };
  }
}
