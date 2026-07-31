import {
  HeadBucketCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../lib/storage.js";
import { env } from "../config/env.js";

export class StorageService {
  static async checkBucketAccess(): Promise<void> {
    const command = new HeadBucketCommand({ Bucket: env.STORAGE_BUCKET });
    await s3Client.send(command);
  }

  static async uploadObject(
    storageKey: string,
    body: Buffer,
    mimeType: string
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: storageKey,
      Body: body,
      ContentType: mimeType
    });
    await s3Client.send(command);
  }

  static async deleteObject(storageKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: storageKey
    });
    await s3Client.send(command);
  }

  static async getPreviewUrl(
    storageKey: string,
    mimeType: string
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: storageKey,
      ResponseContentType: mimeType,
      ResponseContentDisposition: "inline"
    });
    return getSignedUrl(s3Client, command, {
      expiresIn: env.SIGNED_URL_TTL_SECONDS
    });
  }

  static async getDownloadUrl(
    storageKey: string,
    filename: string
  ): Promise<string> {
    const safeFilename = encodeURIComponent(filename);
    const command = new GetObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: storageKey,
      ResponseContentDisposition: `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`
    });
    return getSignedUrl(s3Client, command, {
      expiresIn: env.SIGNED_URL_TTL_SECONDS
    });
  }
}
