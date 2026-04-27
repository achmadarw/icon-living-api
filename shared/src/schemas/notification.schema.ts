import { z } from 'zod';

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isRead: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export type NotificationQuery = z.infer<typeof notificationQuerySchema>;
