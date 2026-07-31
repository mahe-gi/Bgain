import { S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";

export const s3Client = new S3Client({
  endpoint: env.STORAGE_ENDPOINT,
  region: env.STORAGE_REGION,
  credentials: {
    accessKeyId: env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY
  },
  forcePathStyle: true
});
