import { z } from "zod";

export const searchSchema = z.object({
  q: z
    .string({
      required_error: "Search query parameter 'q' is required"
    })
    .transform((val) => val.trim())
    .refine((val) => val.length >= 2 && val.length <= 100, {
      message: "Search query must be between 2 and 100 characters in length"
    })
});

export type SearchQueryInput = z.infer<typeof searchSchema>;
