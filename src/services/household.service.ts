import { prisma } from '../lib/prisma';
import { DuplicateError, NotFoundError } from '../utils/errors';
import type { Prisma } from '@prisma/client';
import type { CreateHouseholdInput, UpdateHouseholdInput } from '@tia/shared';

const householdSelect = {
  id: true,
  unitNumber: true,
  occupancyStatus: true,
  occupancyNote: true,
  homeCurrentStatus: true,
  homeStatusNote: true,
  residentCount: true,
  emergencyContact: true,
  hobbies: true,
  consentGiven: true,
  formSubmittedAt: true,
  createdAt: true,
  updatedAt: true,
  members: {
    select: {
      id: true,
      name: true,
      age: true,
      relationLabel: true,
      isPrimary: true,
      notes: true,
      rawText: true,
    },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  },
  vehicles: {
    select: {
      id: true,
      type: true,
      plateNumber: true,
      color: true,
      description: true,
      rawText: true,
    },
    orderBy: { createdAt: 'asc' },
  },
  staff: {
    select: {
      id: true,
      name: true,
      role: true,
      isLiveIn: true,
      description: true,
      rawText: true,
    },
    orderBy: { createdAt: 'asc' },
  },
  emergencyContacts: {
    select: {
      id: true,
      name: true,
      phone: true,
      relation: true,
      priority: true,
      rawText: true,
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  },
  hobbiesDetail: {
    select: {
      id: true,
      hobbyText: true,
    },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.HouseholdSelect;

export class HouseholdService {
  async findById(id: string) {
    const household = await prisma.household.findUnique({
      where: { id },
      select: householdSelect,
    });

    if (!household) throw new NotFoundError('Household');
    return household;
  }

  async create(input: CreateHouseholdInput) {
    const unitNumber = input.unitNumber.trim();
    const existing = await prisma.household.findUnique({ where: { unitNumber } });
    if (existing) throw new DuplicateError('Household unit');

    const household = await prisma.household.create({
      data: { unitNumber },
      select: householdSelect,
    });

    await prisma.user.updateMany({
      where: { unitNumber },
      data: { householdId: household.id },
    });

    return household;
  }

  async update(id: string, input: UpdateHouseholdInput) {
    await this.findById(id);

    const {
      members,
      vehicles,
      staff,
      emergencyContacts,
      hobbiesDetail,
      ...householdInput
    } = input;

    return prisma.$transaction(async (tx) => {
      await tx.household.update({
        where: { id },
        data: householdInput,
      });

      if (members) {
        await tx.householdMember.deleteMany({ where: { householdId: id } });
        if (members.length > 0) {
          await tx.householdMember.createMany({
            data: members.map((member) => ({
              householdId: id,
              name: member.name ?? null,
              age: member.age ?? null,
              relationLabel: member.relationLabel ?? null,
              isPrimary: member.isPrimary ?? false,
              notes: member.notes ?? null,
              rawText: member.rawText ?? null,
            })),
          });
        }
      }

      if (vehicles) {
        await tx.householdVehicle.deleteMany({ where: { householdId: id } });
        if (vehicles.length > 0) {
          await tx.householdVehicle.createMany({
            data: vehicles.map((vehicle) => ({
              householdId: id,
              type: vehicle.type ?? 'LAINNYA',
              plateNumber: vehicle.plateNumber ?? null,
              color: vehicle.color ?? null,
              description: vehicle.description ?? null,
              rawText: vehicle.rawText ?? null,
            })),
          });
        }
      }

      if (staff) {
        await tx.householdStaff.deleteMany({ where: { householdId: id } });
        if (staff.length > 0) {
          await tx.householdStaff.createMany({
            data: staff.map((item) => ({
              householdId: id,
              name: item.name ?? null,
              role: item.role ?? 'LAINNYA',
              isLiveIn: item.isLiveIn ?? null,
              description: item.description ?? null,
              rawText: item.rawText ?? null,
            })),
          });
        }
      }

      if (emergencyContacts) {
        await tx.householdEmergencyContact.deleteMany({ where: { householdId: id } });
        if (emergencyContacts.length > 0) {
          await tx.householdEmergencyContact.createMany({
            data: emergencyContacts.map((contact) => ({
              householdId: id,
              name: contact.name ?? null,
              phone: contact.phone ?? null,
              relation: contact.relation ?? null,
              priority: contact.priority ?? 1,
              rawText: contact.rawText ?? null,
            })),
          });
        }
      }

      if (hobbiesDetail) {
        await tx.householdHobby.deleteMany({ where: { householdId: id } });
        if (hobbiesDetail.length > 0) {
          await tx.householdHobby.createMany({
            data: hobbiesDetail.map((hobby) => ({
              householdId: id,
              hobbyText: hobby.hobbyText,
            })),
          });
        }
      }

      const updated = await tx.household.findUnique({
        where: { id },
        select: householdSelect,
      });

      if (!updated) throw new NotFoundError('Household');
      return updated;
    });
  }
}

export const householdService = new HouseholdService();
