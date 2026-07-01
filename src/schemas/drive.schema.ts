import { z } from 'zod';

export const authHeaderSchema = z.string().min(1);

export const listDriveSchema = z.object({
  body: z.any(),
  params: z.any(),
  query: z.object({
    folderId: z.string().optional(),
  }),
  headers: z.object({
    authorization: authHeaderSchema,
  }),
});

export const createFolderSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    parentId: z.string().optional(),
  }),
  params: z.any(),
  query: z.any(),
  headers: z.object({
    authorization: authHeaderSchema,
  }),
});

export const uploadDriveSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    content: z.string().min(1),
    mimeType: z.string().default('text/plain'),
    parentId: z.string().optional(),
  }),
  params: z.any(),
  query: z.any(),
  headers: z.object({
    authorization: authHeaderSchema,
  }),
});
