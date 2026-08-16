import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { Roles } from "../common/roles.decorator";

@Roles("merchant", "super-admin")
@Controller("api/uploads")
export class UploadsController {
  @Post("images")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "uploads",
        filename: (_request, file, callback) => {
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
          callback(null, uniqueName);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("File is required.");
    }

    return {
      id: `img-${Date.now()}`,
      filename: file.filename,
      mimeType: file.mimetype,
      url: `/uploads/${file.filename}`,
      size: file.size,
      provider: "local-disk",
    };
  }
}
