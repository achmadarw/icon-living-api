import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { securityPersonnelController } from '../controllers/security-personnel.controller';
import { rosterController } from '../controllers/roster.controller';

const router: RouterType = Router();

// Menu Keamanan: Ketua + Seksi Keamanan.
router.use(authenticate);
router.use(authorize('KETUA', 'SEKSI_KEAMANAN'));

// Skema didefinisikan inline agar tidak bergantung pada resolusi @tia/shared saat runtime.
const idParam = z.object({ id: z.string().min(1) });

const createPersonnelSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(100),
  phone: z.string().max(20).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

const updatePersonnelSchema = createPersonnelSchema.partial();

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const createShiftSchema = z.object({
  name: z.string().trim().min(2, 'Nama shift minimal 2 karakter').max(100),
  code: z.string().trim().min(1, 'Kode shift wajib diisi').max(10),
  startTime: z.string().regex(TIME_REGEX, 'Format jam mulai harus HH:MM'),
  endTime: z.string().regex(TIME_REGEX, 'Format jam selesai harus HH:MM'),
  color: z.string().max(20).nullable().optional(),
  description: z.string().max(255).nullable().optional(),
  isActive: z.boolean().optional(),
});

const updateShiftSchema = createShiftSchema.partial();

// ─── Personel ───────────────────────────────────────────
router.get('/personnel', (req, res, next) =>
  securityPersonnelController.listPersonnel(req, res, next));
router.post('/personnel', validate(createPersonnelSchema), (req, res, next) =>
  securityPersonnelController.createPersonnel(req, res, next));
router.patch('/personnel/:id', validate(idParam, 'params'), validate(updatePersonnelSchema), (req, res, next) =>
  securityPersonnelController.updatePersonnel(req, res, next));
router.delete('/personnel/:id', validate(idParam, 'params'), (req, res, next) =>
  securityPersonnelController.deletePersonnel(req, res, next));

// ─── Shift ──────────────────────────────────────────────
router.get('/shifts', (req, res, next) =>
  securityPersonnelController.listShifts(req, res, next));
router.post('/shifts', validate(createShiftSchema), (req, res, next) =>
  securityPersonnelController.createShift(req, res, next));
router.patch('/shifts/:id', validate(idParam, 'params'), validate(updateShiftSchema), (req, res, next) =>
  securityPersonnelController.updateShift(req, res, next));
router.delete('/shifts/:id', validate(idParam, 'params'), (req, res, next) =>
  securityPersonnelController.deleteShift(req, res, next));

// ─── Roster bulanan ─────────────────────────────────────
//
// Roster dibentuk SEPENUHNYA lewat Auto Assign, mengikuti alur TIA saat ini.
// Pola dibuat otomatis oleh algoritma, jadi tidak ada endpoint CRUD pola
// maupun penetapan pola manual.

const monthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}(-\d{2})?$/, 'Format bulan harus YYYY-MM atau YYYY-MM-DD');

const monthBodySchema = z.object({ month: monthSchema });

const autoAssignSchema = z.object({
  month: monthSchema,
  mode: z
    .enum(['random-pattern', 'random-personnel', 'random-personnel-raw', 'continue-previous'])
    .optional(),
  template: z.enum(['5p-3s', '5p-2s']).optional(),
  rotationPattern: z.enum(['1122-off', '2211-off']).optional(),
});

router.get('/roster/assignments', (req, res, next) =>
  rosterController.listAssignments(req, res, next));
router.get('/roster/schedule', (req, res, next) =>
  rosterController.getSchedule(req, res, next));
router.get('/roster/undo-availability', (req, res, next) =>
  rosterController.undoAvailability(req, res, next));
router.get('/roster/export-pdf', (req, res, next) =>
  rosterController.exportPdf(req, res, next));

// Koreksi manual satu hari. shiftId null = dijadikan OFF.
const setDaySchema = z.object({
  personnelId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  shiftId: z.string().min(1).nullable(),
});

const clearDaySchema = z.object({
  personnelId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
});

router.post('/roster/day', validate(setDaySchema), (req, res, next) =>
  rosterController.setDay(req, res, next));
router.post('/roster/day/clear', validate(clearDaySchema), (req, res, next) =>
  rosterController.clearDay(req, res, next));

router.post('/roster/auto-assign', validate(autoAssignSchema), (req, res, next) =>
  rosterController.autoAssign(req, res, next));
router.post('/roster/auto-assign/undo', validate(monthBodySchema), (req, res, next) =>
  rosterController.undoAutoAssign(req, res, next));
router.post('/roster/clear-month', validate(monthBodySchema), (req, res, next) =>
  rosterController.clearMonth(req, res, next));

export default router;
