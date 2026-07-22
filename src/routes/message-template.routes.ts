import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { messageTemplateController } from '../controllers/message-template.controller';

// Skema didefinisikan inline (bukan dari @tia/shared) agar route tidak
// bergantung pada resolusi paket shared saat runtime.
const templateVariableSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^\{[a-zA-Z][a-zA-Z0-9]*\}$/, 'Format token harus seperti {namaVariabel}'),
  label: z.string().trim().min(1, 'Label wajib diisi').max(60),
  description: z.string().trim().max(160).optional().nullable(),
  defaultValue: z.string().trim().max(500).optional().nullable(),
});

const createMessageTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Nama template wajib diisi').max(120),
  body: z.string().trim().min(1, 'Isi pesan wajib diisi').max(2000, 'Pesan maksimal 2000 karakter'),
  variables: z.array(templateVariableSchema).max(20).optional().default([]),
});

const updateMessageTemplateSchema = createMessageTemplateSchema.partial();

const idParamSchema = z.object({
  id: z.string().min(1, 'ID wajib diisi'),
});

const router: RouterType = Router();

router.use(authenticate);
router.use(authorize('KETUA', 'BENDAHARA'));

router.get('/', (req, res, next) => messageTemplateController.list(req, res, next));

router.post(
  '/',
  validate(createMessageTemplateSchema),
  (req, res, next) => messageTemplateController.create(req, res, next),
);

router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateMessageTemplateSchema),
  (req, res, next) => messageTemplateController.update(req, res, next),
);

router.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  (req, res, next) => messageTemplateController.remove(req, res, next),
);

export default router;
