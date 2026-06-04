"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateHouseholdSchema = exports.createHouseholdSchema = exports.householdHobbyInputSchema = exports.householdEmergencyContactInputSchema = exports.householdStaffInputSchema = exports.householdVehicleInputSchema = exports.householdMemberInputSchema = exports.householdStaffRoleSchema = exports.vehicleTypeSchema = exports.homeCurrentStatusSchema = exports.occupancyStatusSchema = void 0;
const zod_1 = require("zod");
exports.occupancyStatusSchema = zod_1.z.enum(['PEMILIK', 'KONTRAK', 'KELUARGA', 'LAINNYA']);
exports.homeCurrentStatusSchema = zod_1.z.enum(['DIHUNI', 'KOSONG', 'DISEWAKAN', 'RENOVASI', 'LAINNYA']);
exports.vehicleTypeSchema = zod_1.z.enum(['MOBIL', 'MOTOR', 'SEPEDA', 'LAINNYA']);
exports.householdStaffRoleSchema = zod_1.z.enum(['ART', 'SOPIR', 'LAINNYA']);
const nullableString = zod_1.z.string().max(255).nullable().optional();
const nullableLongString = zod_1.z.string().max(1000).nullable().optional();
exports.householdMemberInputSchema = zod_1.z.object({
    name: nullableString,
    age: zod_1.z.coerce.number().int().min(0).max(120).nullable().optional(),
    relationLabel: nullableString,
    isPrimary: zod_1.z.boolean().optional(),
    notes: nullableLongString,
    rawText: nullableLongString,
});
exports.householdVehicleInputSchema = zod_1.z.object({
    type: exports.vehicleTypeSchema.optional(),
    plateNumber: nullableString,
    color: nullableString,
    description: nullableLongString,
    rawText: nullableLongString,
});
exports.householdStaffInputSchema = zod_1.z.object({
    name: nullableString,
    role: exports.householdStaffRoleSchema.optional(),
    isLiveIn: zod_1.z.boolean().nullable().optional(),
    description: nullableLongString,
    rawText: nullableLongString,
});
exports.householdEmergencyContactInputSchema = zod_1.z.object({
    name: nullableString,
    phone: nullableString,
    relation: nullableString,
    priority: zod_1.z.coerce.number().int().min(1).max(99).optional(),
    rawText: nullableLongString,
});
exports.householdHobbyInputSchema = zod_1.z.object({
    hobbyText: zod_1.z.string().min(1).max(255),
});
exports.createHouseholdSchema = zod_1.z.object({
    unitNumber: zod_1.z.string().min(1).max(20),
});
exports.updateHouseholdSchema = zod_1.z.object({
    occupancyStatus: exports.occupancyStatusSchema.nullable().optional(),
    occupancyNote: nullableLongString,
    homeCurrentStatus: exports.homeCurrentStatusSchema.nullable().optional(),
    homeStatusNote: nullableLongString,
    residentCount: zod_1.z.coerce.number().int().min(0).max(99).nullable().optional(),
    emergencyContact: nullableLongString,
    hobbies: nullableLongString,
    consentGiven: zod_1.z.boolean().nullable().optional(),
    formSubmittedAt: zod_1.z.coerce.date().nullable().optional(),
    members: zod_1.z.array(exports.householdMemberInputSchema).optional(),
    vehicles: zod_1.z.array(exports.householdVehicleInputSchema).optional(),
    staff: zod_1.z.array(exports.householdStaffInputSchema).optional(),
    emergencyContacts: zod_1.z.array(exports.householdEmergencyContactInputSchema).optional(),
    hobbiesDetail: zod_1.z.array(exports.householdHobbyInputSchema).optional(),
});
//# sourceMappingURL=household.schema.js.map