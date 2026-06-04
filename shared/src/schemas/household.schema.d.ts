import { z } from 'zod';
export declare const occupancyStatusSchema: z.ZodEnum<["PEMILIK", "KONTRAK", "KELUARGA", "LAINNYA"]>;
export declare const homeCurrentStatusSchema: z.ZodEnum<["DIHUNI", "KOSONG", "DISEWAKAN", "RENOVASI", "LAINNYA"]>;
export declare const vehicleTypeSchema: z.ZodEnum<["MOBIL", "MOTOR", "SEPEDA", "LAINNYA"]>;
export declare const householdStaffRoleSchema: z.ZodEnum<["ART", "SOPIR", "LAINNYA"]>;
export declare const householdMemberInputSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    age: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    relationLabel: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isPrimary: z.ZodOptional<z.ZodBoolean>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    rawText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name?: string | null | undefined;
    age?: number | null | undefined;
    relationLabel?: string | null | undefined;
    isPrimary?: boolean | undefined;
    notes?: string | null | undefined;
    rawText?: string | null | undefined;
}, {
    name?: string | null | undefined;
    age?: number | null | undefined;
    relationLabel?: string | null | undefined;
    isPrimary?: boolean | undefined;
    notes?: string | null | undefined;
    rawText?: string | null | undefined;
}>;
export declare const householdVehicleInputSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<["MOBIL", "MOTOR", "SEPEDA", "LAINNYA"]>>;
    plateNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    color: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    rawText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type?: "LAINNYA" | "MOBIL" | "MOTOR" | "SEPEDA" | undefined;
    description?: string | null | undefined;
    rawText?: string | null | undefined;
    plateNumber?: string | null | undefined;
    color?: string | null | undefined;
}, {
    type?: "LAINNYA" | "MOBIL" | "MOTOR" | "SEPEDA" | undefined;
    description?: string | null | undefined;
    rawText?: string | null | undefined;
    plateNumber?: string | null | undefined;
    color?: string | null | undefined;
}>;
export declare const householdStaffInputSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    role: z.ZodOptional<z.ZodEnum<["ART", "SOPIR", "LAINNYA"]>>;
    isLiveIn: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    rawText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name?: string | null | undefined;
    role?: "LAINNYA" | "ART" | "SOPIR" | undefined;
    description?: string | null | undefined;
    rawText?: string | null | undefined;
    isLiveIn?: boolean | null | undefined;
}, {
    name?: string | null | undefined;
    role?: "LAINNYA" | "ART" | "SOPIR" | undefined;
    description?: string | null | undefined;
    rawText?: string | null | undefined;
    isLiveIn?: boolean | null | undefined;
}>;
export declare const householdEmergencyContactInputSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    relation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    priority: z.ZodOptional<z.ZodNumber>;
    rawText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name?: string | null | undefined;
    phone?: string | null | undefined;
    rawText?: string | null | undefined;
    relation?: string | null | undefined;
    priority?: number | undefined;
}, {
    name?: string | null | undefined;
    phone?: string | null | undefined;
    rawText?: string | null | undefined;
    relation?: string | null | undefined;
    priority?: number | undefined;
}>;
export declare const householdHobbyInputSchema: z.ZodObject<{
    hobbyText: z.ZodString;
}, "strip", z.ZodTypeAny, {
    hobbyText: string;
}, {
    hobbyText: string;
}>;
export declare const createHouseholdSchema: z.ZodObject<{
    unitNumber: z.ZodString;
}, "strip", z.ZodTypeAny, {
    unitNumber: string;
}, {
    unitNumber: string;
}>;
export declare const updateHouseholdSchema: z.ZodObject<{
    occupancyStatus: z.ZodOptional<z.ZodNullable<z.ZodEnum<["PEMILIK", "KONTRAK", "KELUARGA", "LAINNYA"]>>>;
    occupancyNote: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    homeCurrentStatus: z.ZodOptional<z.ZodNullable<z.ZodEnum<["DIHUNI", "KOSONG", "DISEWAKAN", "RENOVASI", "LAINNYA"]>>>;
    homeStatusNote: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    residentCount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    emergencyContact: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    hobbies: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    consentGiven: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    formSubmittedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    members: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        age: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        relationLabel: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        isPrimary: z.ZodOptional<z.ZodBoolean>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        rawText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name?: string | null | undefined;
        age?: number | null | undefined;
        relationLabel?: string | null | undefined;
        isPrimary?: boolean | undefined;
        notes?: string | null | undefined;
        rawText?: string | null | undefined;
    }, {
        name?: string | null | undefined;
        age?: number | null | undefined;
        relationLabel?: string | null | undefined;
        isPrimary?: boolean | undefined;
        notes?: string | null | undefined;
        rawText?: string | null | undefined;
    }>, "many">>;
    vehicles: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodOptional<z.ZodEnum<["MOBIL", "MOTOR", "SEPEDA", "LAINNYA"]>>;
        plateNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        color: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        rawText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        type?: "LAINNYA" | "MOBIL" | "MOTOR" | "SEPEDA" | undefined;
        description?: string | null | undefined;
        rawText?: string | null | undefined;
        plateNumber?: string | null | undefined;
        color?: string | null | undefined;
    }, {
        type?: "LAINNYA" | "MOBIL" | "MOTOR" | "SEPEDA" | undefined;
        description?: string | null | undefined;
        rawText?: string | null | undefined;
        plateNumber?: string | null | undefined;
        color?: string | null | undefined;
    }>, "many">>;
    staff: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        role: z.ZodOptional<z.ZodEnum<["ART", "SOPIR", "LAINNYA"]>>;
        isLiveIn: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        rawText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name?: string | null | undefined;
        role?: "LAINNYA" | "ART" | "SOPIR" | undefined;
        description?: string | null | undefined;
        rawText?: string | null | undefined;
        isLiveIn?: boolean | null | undefined;
    }, {
        name?: string | null | undefined;
        role?: "LAINNYA" | "ART" | "SOPIR" | undefined;
        description?: string | null | undefined;
        rawText?: string | null | undefined;
        isLiveIn?: boolean | null | undefined;
    }>, "many">>;
    emergencyContacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        relation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        priority: z.ZodOptional<z.ZodNumber>;
        rawText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name?: string | null | undefined;
        phone?: string | null | undefined;
        rawText?: string | null | undefined;
        relation?: string | null | undefined;
        priority?: number | undefined;
    }, {
        name?: string | null | undefined;
        phone?: string | null | undefined;
        rawText?: string | null | undefined;
        relation?: string | null | undefined;
        priority?: number | undefined;
    }>, "many">>;
    hobbiesDetail: z.ZodOptional<z.ZodArray<z.ZodObject<{
        hobbyText: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        hobbyText: string;
    }, {
        hobbyText: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    occupancyStatus?: "PEMILIK" | "KONTRAK" | "KELUARGA" | "LAINNYA" | null | undefined;
    occupancyNote?: string | null | undefined;
    homeCurrentStatus?: "LAINNYA" | "DIHUNI" | "KOSONG" | "DISEWAKAN" | "RENOVASI" | null | undefined;
    homeStatusNote?: string | null | undefined;
    residentCount?: number | null | undefined;
    emergencyContact?: string | null | undefined;
    hobbies?: string | null | undefined;
    consentGiven?: boolean | null | undefined;
    formSubmittedAt?: Date | null | undefined;
    members?: {
        name?: string | null | undefined;
        age?: number | null | undefined;
        relationLabel?: string | null | undefined;
        isPrimary?: boolean | undefined;
        notes?: string | null | undefined;
        rawText?: string | null | undefined;
    }[] | undefined;
    vehicles?: {
        type?: "LAINNYA" | "MOBIL" | "MOTOR" | "SEPEDA" | undefined;
        description?: string | null | undefined;
        rawText?: string | null | undefined;
        plateNumber?: string | null | undefined;
        color?: string | null | undefined;
    }[] | undefined;
    staff?: {
        name?: string | null | undefined;
        role?: "LAINNYA" | "ART" | "SOPIR" | undefined;
        description?: string | null | undefined;
        rawText?: string | null | undefined;
        isLiveIn?: boolean | null | undefined;
    }[] | undefined;
    emergencyContacts?: {
        name?: string | null | undefined;
        phone?: string | null | undefined;
        rawText?: string | null | undefined;
        relation?: string | null | undefined;
        priority?: number | undefined;
    }[] | undefined;
    hobbiesDetail?: {
        hobbyText: string;
    }[] | undefined;
}, {
    occupancyStatus?: "PEMILIK" | "KONTRAK" | "KELUARGA" | "LAINNYA" | null | undefined;
    occupancyNote?: string | null | undefined;
    homeCurrentStatus?: "LAINNYA" | "DIHUNI" | "KOSONG" | "DISEWAKAN" | "RENOVASI" | null | undefined;
    homeStatusNote?: string | null | undefined;
    residentCount?: number | null | undefined;
    emergencyContact?: string | null | undefined;
    hobbies?: string | null | undefined;
    consentGiven?: boolean | null | undefined;
    formSubmittedAt?: Date | null | undefined;
    members?: {
        name?: string | null | undefined;
        age?: number | null | undefined;
        relationLabel?: string | null | undefined;
        isPrimary?: boolean | undefined;
        notes?: string | null | undefined;
        rawText?: string | null | undefined;
    }[] | undefined;
    vehicles?: {
        type?: "LAINNYA" | "MOBIL" | "MOTOR" | "SEPEDA" | undefined;
        description?: string | null | undefined;
        rawText?: string | null | undefined;
        plateNumber?: string | null | undefined;
        color?: string | null | undefined;
    }[] | undefined;
    staff?: {
        name?: string | null | undefined;
        role?: "LAINNYA" | "ART" | "SOPIR" | undefined;
        description?: string | null | undefined;
        rawText?: string | null | undefined;
        isLiveIn?: boolean | null | undefined;
    }[] | undefined;
    emergencyContacts?: {
        name?: string | null | undefined;
        phone?: string | null | undefined;
        rawText?: string | null | undefined;
        relation?: string | null | undefined;
        priority?: number | undefined;
    }[] | undefined;
    hobbiesDetail?: {
        hobbyText: string;
    }[] | undefined;
}>;
export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;
export type UpdateHouseholdInput = z.infer<typeof updateHouseholdSchema>;
//# sourceMappingURL=household.schema.d.ts.map