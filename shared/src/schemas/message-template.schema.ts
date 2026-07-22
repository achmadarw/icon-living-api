import { z } from 'zod';

// Satu variabel custom yang didefinisikan pada template (mis. {jatuhTempo}).
export const templateVariableSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^\{[a-zA-Z][a-zA-Z0-9]*\}$/, 'Format token harus seperti {namaVariabel}'),
  label: z.string().trim().min(1, 'Label wajib diisi').max(60),
  description: z.string().trim().max(160).optional().nullable(),
  defaultValue: z.string().trim().max(500).optional().nullable(),
});
export type TemplateVariable = z.infer<typeof templateVariableSchema>;

export const createMessageTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Nama template wajib diisi').max(120),
  body: z.string().trim().min(1, 'Isi pesan wajib diisi').max(2000, 'Pesan maksimal 2000 karakter'),
  variables: z.array(templateVariableSchema).max(20).optional().default([]),
});
export type CreateMessageTemplateInput = z.infer<typeof createMessageTemplateSchema>;

export const updateMessageTemplateSchema = createMessageTemplateSchema.partial();
export type UpdateMessageTemplateInput = z.infer<typeof updateMessageTemplateSchema>;
