import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { userController } from '../controllers/user.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import {
  createUserSchema, updateUserSchema,
  changePasswordSchema, resetPasswordSchema, paginationSchema, idParamSchema,
} from '@tia/shared';

const router: RouterType = Router();

// Skema self-service household (inline agar tidak bergantung resolusi @tia/shared runtime).
// Field sensitif (iplPaymentTypeId, consentGiven, formSubmittedAt) sengaja TIDAK diikutkan —
// tetap dikelola pengurus.
const nullableStr = z.string().max(255).nullable().optional();
const nullableLongStr = z.string().max(1000).nullable().optional();

const myHouseholdMemberSchema = z.object({
  name: nullableStr,
  age: z.coerce.number().int().min(0).max(120).nullable().optional(),
  relationLabel: nullableStr,
  isPrimary: z.boolean().optional(),
  notes: nullableLongStr,
});
const myHouseholdVehicleSchema = z.object({
  type: z.enum(['MOBIL', 'MOTOR', 'SEPEDA', 'LAINNYA']).optional(),
  plateNumber: nullableStr,
  color: nullableStr,
  description: nullableLongStr,
});
const myHouseholdStaffSchema = z.object({
  name: nullableStr,
  role: z.enum(['ART', 'SOPIR', 'LAINNYA']).optional(),
  isLiveIn: z.boolean().nullable().optional(),
  description: nullableLongStr,
});
const myHouseholdEmergencyContactSchema = z.object({
  name: nullableStr,
  phone: nullableStr,
  relation: nullableStr,
  priority: z.coerce.number().int().min(1).max(99).optional(),
});
const myHouseholdHobbySchema = z.object({
  hobbyText: z.string().min(1).max(255),
});

// Skema profil self-service inline: izinkan warga mengubah nama, HP, dan alamat.
const updateMyProfileSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100).optional(),
  phone: z.string().max(20).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  avatarUrl: z.string().max(500).nullable().optional(),
});

const updateMyHouseholdSchema = z.object({
  occupancyStatus: z.enum(['PEMILIK', 'KONTRAK', 'KELUARGA', 'LAINNYA']).nullable().optional(),
  occupancyNote: nullableLongStr,
  homeCurrentStatus: z.enum(['DIHUNI', 'KOSONG', 'DISEWAKAN', 'RENOVASI', 'LAINNYA']).nullable().optional(),
  homeStatusNote: nullableLongStr,
  residentCount: z.coerce.number().int().min(0).max(99).nullable().optional(),
  emergencyContact: nullableLongStr,
  hobbies: nullableLongStr,
  members: z.array(myHouseholdMemberSchema).max(30).optional(),
  vehicles: z.array(myHouseholdVehicleSchema).max(30).optional(),
  staff: z.array(myHouseholdStaffSchema).max(30).optional(),
  emergencyContacts: z.array(myHouseholdEmergencyContactSchema).max(30).optional(),
  hobbiesDetail: z.array(myHouseholdHobbySchema).max(50).optional(),
});

router.use(authenticate);

// Profile routes (any authenticated user)
router.get('/me', (req, res, next) => userController.findMe(req, res, next));
router.patch('/me', validate(updateMyProfileSchema), (req, res, next) => userController.updateProfile(req, res, next));
router.patch('/me/password', validate(changePasswordSchema), (req, res, next) => userController.changePassword(req, res, next));
router.get('/me/household', (req, res, next) => userController.findMyHousehold(req, res, next));
router.patch('/me/household', validate(updateMyHouseholdSchema), (req, res, next) => userController.updateMyHousehold(req, res, next));

// Admin routes
// Export harus sebelum '/:id' agar tidak tertangkap sebagai id.
router.get('/export', authorize('KETUA', 'BENDAHARA'), (req, res, next) => userController.exportResidents(req, res, next));
router.post('/', authorize('KETUA', 'BENDAHARA'), validate(createUserSchema), (req, res, next) => userController.create(req, res, next));
router.get('/', authorize('KETUA', 'BENDAHARA'), validate(paginationSchema, 'query'), (req, res, next) => userController.findAll(req, res, next));
router.get('/:id', authorize('KETUA', 'BENDAHARA'), validate(idParamSchema, 'params'), (req, res, next) => userController.findById(req, res, next));
router.patch('/:id', authorize('KETUA', 'BENDAHARA'), validate(idParamSchema, 'params'), validate(updateUserSchema), (req, res, next) => userController.update(req, res, next));
router.patch('/:id/reset-password', authorize('KETUA'), validate(idParamSchema, 'params'), validate(resetPasswordSchema), (req, res, next) => userController.resetPassword(req, res, next));
router.patch('/:id/toggle-active', authorize('KETUA'), validate(idParamSchema, 'params'), (req, res, next) => userController.toggleActive(req, res, next));

export default router;
