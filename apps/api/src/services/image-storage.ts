import { BadRequestException, Logger, ServiceUnavailableException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { getUploadsDirectory, supabaseStorageConfig, uploadStorageMode } from "../common/deployment-config";

export function supabaseImageObjectPath(imageUrl: string) {
  const { url, bucket } = supabaseStorageConfig();
  const prefix = `${url}/storage/v1/object/public/${bucket}/`;
  if (!imageUrl.startsWith(prefix)) return null;
  const objectPath = imageUrl.slice(prefix.length);
  return /^products\/[0-9a-f-]{36}\.(jpg|png|webp|heic)$/.test(objectPath) ? objectPath : null;
}

function imageExtension(bytes: Buffer, mimeType: string) {
  if (mimeType === "image/png" && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if ((mimeType === "image/jpeg" || mimeType === "image/jpg") && bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
  if (mimeType === "image/webp" && bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  // HEIC/HEIF (iPhone) — detect by ftyp box
  if ((mimeType === "image/heic" || mimeType === "image/heif" || mimeType === "image/heic-sequence" || mimeType === "image/heif-sequence") &&
      bytes.length >= 12 && bytes.toString("ascii", 4, 8) === "ftyp") return "heic";
  // Fallback: detect by magic bytes when mimeType is empty or generic
  if (!mimeType || mimeType === "application/octet-stream") {
    if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
    if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
    if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
    if (bytes.length >= 12 && bytes.toString("ascii", 4, 8) === "ftyp") return "heic";
  }
  throw new BadRequestException("Only PNG, JPEG, WebP and HEIC image files are supported.");
}

export async function storeProductImage(file: Express.Multer.File) {
  const mode = uploadStorageMode();
  if (mode === "disabled") throw new ServiceUnavailableException("Image storage is unavailable.");
  let extension = imageExtension(file.buffer, file.mimetype);
  let buffer = file.buffer;
  let contentType = file.mimetype;

  // Convert HEIC/HEIF (iPhone) to JPEG so browsers can display it
  if (extension === "heic") {
    try {
      buffer = await sharp(file.buffer).jpeg({ quality: 90 }).toBuffer();
      extension = "jpg";
      contentType = "image/jpeg";
    } catch {
      Logger.error("HEIC to JPEG conversion failed.", "ImageStorage");
      throw new BadRequestException("Unable to process this image format. Please use PNG, JPEG or WebP.");
    }
  }

  const filename = `${randomUUID()}.${extension}`;
  if (mode === "local") {
    await writeFile(join(getUploadsDirectory(), filename), buffer, { flag: "wx" });
    return { filename, url: `/uploads/${filename}`, provider: "local-disk" };
  }
  const { url, bucket, key } = supabaseStorageConfig();
  const objectPath = `products/${filename}`;
  let response: Response;
  try {
    response = await fetch(`${url}/storage/v1/object/${bucket}/${objectPath}`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": contentType, "x-upsert": "false" },
      body: new Uint8Array(buffer),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    Logger.error("Product image storage request failed; provider details withheld.", "ImageStorage");
    throw new ServiceUnavailableException("Image upload failed. Please retry.");
  }
  if (!response.ok) {
    Logger.error(`Product image storage rejected upload (HTTP ${response.status}); provider details withheld.`, "ImageStorage");
    throw new ServiceUnavailableException("Image storage rejected the upload. Contact the administrator.");
  }
  return { filename, url: `${url}/storage/v1/object/public/${bucket}/${objectPath}`, provider: "supabase" };
}