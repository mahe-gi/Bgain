import { z } from "zod";

export const folderQuerySchema = z.object({
  parentId: z
    .string()
    .optional()
    .default("root")
    .refine(
      (val) => {
        if (val === "root") return true;
        return z.string().uuid().safeParse(val).success;
      },
      { message: "parentId must be 'root' or a valid UUID" }
    ),
  sortBy: z
    .enum(["name", "createdAt"], {
      errorMap: () => ({ message: "sortBy must be 'name' or 'createdAt'" })
    })
    .optional()
    .default("name"),
  order: z
    .enum(["asc", "desc"], {
      errorMap: () => ({ message: "order must be 'asc' or 'desc'" })
    })
    .optional()
    .default("asc")
});

export type FolderQueryInput = z.infer<typeof folderQuerySchema>;

export const createFolderSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Folder name is required")
      .max(120, "Folder name must be at most 120 characters"),
    parentId: z
      .string()
      .uuid("parentId must be a valid UUID")
      .nullable()
      .optional()
      .transform((val) => val ?? null)
  })
  .strict();

export type CreateFolderInput = z.infer<typeof createFolderSchema>;

export const updateFolderSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Folder name must be at least 1 character")
      .max(120, "Folder name must be at most 120 characters")
      .optional(),
    parentId: z
      .string()
      .uuid("parentId must be a valid UUID")
      .nullable()
      .optional()
  })
  .strict()
  .refine((data) => data.name !== undefined || data.parentId !== undefined, {
    message: "At least one of 'name' or 'parentId' must be provided"
  });

export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;

export const folderIdParamSchema = z.object({
  id: z.string().uuid("Invalid folder ID format")
});
