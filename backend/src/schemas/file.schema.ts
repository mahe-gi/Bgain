import { z } from "zod";
import path from "node:path";

export const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "text/plain": [".txt"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"]
};

export const PREVIEWABLE_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/plain"
]);

export const validateFilenameAndMime = (
  originalName: string,
  mimeType: string
): { safeName: string; ext: string } => {
  if (!originalName || typeof originalName !== "string") {
    throw new Error("Invalid filename");
  }

  // Reject path separators, null bytes, and control characters
  if (/[\/\\]|\0|[\x00-\x1F]/.test(originalName)) {
    throw new Error("Filename contains invalid characters");
  }

  const basename = path.basename(originalName).trim();
  if (basename.length < 1 || basename.length > 255) {
    throw new Error("Filename length must be between 1 and 255 characters");
  }

  const ext = path.extname(basename).toLowerCase();
  if (!ext) {
    throw new Error("File must have a valid extension");
  }

  const allowedExts = ALLOWED_FILE_TYPES[mimeType];
  if (!allowedExts || !allowedExts.includes(ext)) {
    throw new Error("MIME type and file extension mismatch or not allowed");
  }

  return { safeName: basename, ext };
};

export const fileQuerySchema = z.object({
  folderId: z
    .string()
    .default("root")
    .refine(
      (val) => {
        if (val === "root") return true;
        return z.string().uuid().safeParse(val).success;
      },
      { message: "folderId must be 'root' or a valid UUID" }
    ),
  sortBy: z.enum(["name", "createdAt", "sizeBytes"], {
    errorMap: () => ({ message: "sortBy must be 'name', 'createdAt', or 'sizeBytes'" })
  }).default("name"),
  order: z.enum(["asc", "desc"], {
    errorMap: () => ({ message: "order must be 'asc' or 'desc'" })
  }).default("asc")
});

export type FileQueryInput = z.infer<typeof fileQuerySchema>;

export const uploadBodySchema = z.object({
  folderId: z
    .string()
    .uuid("folderId must be a valid UUID")
    .nullable()
    .optional()
    .transform((val) => (val === "" || val === undefined ? null : val))
});

export type UploadBodyInput = z.infer<typeof uploadBodySchema>;

export const fileIdParamSchema = z.object({
  id: z.string().uuid("Invalid file ID format")
});

export const updateFileSchema = z
  .object({
    name: z
      .string()
      .transform((val) => val.trim())
      .refine((val) => val.length >= 1 && val.length <= 255, {
        message: "Filename length must be between 1 and 255 characters"
      })
      .optional(),
    folderId: z
      .string()
      .uuid("folderId must be a valid UUID")
      .nullable()
      .optional()
  })
  .strict()
  .refine(
    (data) => data.name !== undefined || data.folderId !== undefined,
    {
      message: "At least one permitted field ('name' or 'folderId') must be provided"
    }
  );

export type UpdateFileInput = z.infer<typeof updateFileSchema>;
