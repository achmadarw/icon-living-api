import { z } from 'zod';

export const occupancyStatusSchema = z.enum(['PEMILIK', 'KONTRAK', 'KELUARGA', 'LAINNYA']);
export const homeCurrentStatusSchema = z.enum(['DIHUNI', 'KOSONG', 'DISEWAKAN', 'RENOVASI', 'LAINNYA']);
export const vehicleTypeSchema = z.enum(['MOBIL', 'MOTOR', 'SEPEDA', 'LAINNYA']);
export const householdStaffRoleSchema = z.enum(['ART', 'SOPIR', 'LAINNYA']);

const nullableString = z.string().max(255).nullable().optional();
const nullableLongString = z.string().max(1000).nullable().optional();

export const householdMemberInputSchema = z.object({
  name: nullableString,
  age: z.coerce.number().int().min(0).max(120).nullable().optional(),
  relationLabel: nullableString,
  isPrimary: z.boolean().optional(),
  notes: nullableLongString,
  rawText: nullableLongString,
});

export const householdVehicleInputSchema = z.object({
  type: vehicleTypeSchema.optional(),
  plateNumber: nullableString,
  color: nullableString,
  description: nullableLongString,
  rawText: nullableLongString,
});

export const householdStaffInputSchema = z.object({
  name: nullableString,
  role: householdStaffRoleSchema.optional(),
  isLiveIn: z.boolean().nullable().optional(),
  description: nullableLongString,
  rawText: nullableLongString,
});

export const householdEmergencyContactInputSchema = z.object({
  name: nullableString,
  phone: nullableString,
  relation: nullableString,
  priority: z.coerce.number().int().min(1).max(99).optional(),
  rawText: nullableLongString,
});

export const householdHobbyInputSchema = z.object({
  hobbyText: z.string().min(1).max(255),
});

export const createHouseholdSchema = z.object({
  unitNumber: z.string().min(1).max(20),
});

export const updateHouseholdSchema = z.object({
  occupancyStatus: occupancyStatusSchema.nullable().optional(),
  occupancyNote: nullableLongString,
  homeCurrentStatus: homeCurrentStatusSchema.nullable().optional(),
  homeStatusNote: nullableLongString,
  residentCount: z.coerce.number().int().min(0).max(99).nullable().optional(),
  emergencyContact: nullableLongString,
  hobbies: nullableLongString,
  consentGiven: z.boolean().nullable().optional(),
  formSubmittedAt: z.coerce.date().nullable().optional(),
  members: z.array(householdMemberInputSchema).optional(),
  vehicles: z.array(householdVehicleInputSchema).optional(),
  staff: z.array(householdStaffInputSchema).optional(),
  emergencyContacts: z.array(householdEmergencyContactInputSchema).optional(),
  hobbiesDetail: z.array(householdHobbyInputSchema).optional(),
});

export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;
export type UpdateHouseholdInput = z.infer<typeof updateHouseholdSchema>;
