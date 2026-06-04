import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { NotFoundError, DuplicateError, DuplicateUnitError, UnauthorizedError } from '../utils/errors';
import { notificationService } from './notification.service';
import { AUTH } from '@tia/shared';
import type { CreateUserInput, UpdateUserInput, UpdateProfileInput, ChangePasswordInput, ResetPasswordInput } from '@tia/shared';
import { logger } from '../utils/logger';

export class UserService {
  async create(input: CreateUserInput) {
    const existingUsername = await prisma.user.findUnique({
      where: { username: input.username },
    });
    if (existingUsername) {
      throw new DuplicateError('Username');
    }

    if (input.unitNumber) {
      const existingUnit = await prisma.user.findUnique({
        where: { unitNumber: input.unitNumber },
      });
      if (existingUnit) {
        throw new DuplicateUnitError();
      }
    }

    const passwordHash = await bcrypt.hash(input.password, AUTH.BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        username: input.username,
        phone: input.phone,
        role: input.role,
        unitNumber: input.unitNumber,
        address: input.address,
        passwordHash,
      },
    });

    const { passwordHash: _, ...userWithoutPassword } = user;

    // Notify user - fire and forget
    notificationService.onUserCreated({ id: user.id, name: user.name }).catch(() => {});

    return userWithoutPassword;
  }

  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, username: true, phone: true,
          role: true, address: true, unitNumber: true, avatarUrl: true,
          isActive: true, createdAt: true, updatedAt: true,
        },
      }),
      prisma.user.count(),
    ]);

    return { users, total };
  }

  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, username: true, phone: true,
        role: true, address: true, unitNumber: true, avatarUrl: true,
        isActive: true, createdAt: true, updatedAt: true,
        household: {
          select: {
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
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return user;
  }

  async update(id: string, input: UpdateUserInput) {
    await this.findById(id);

    if (input.unitNumber) {
      const existing = await prisma.user.findUnique({
        where: { unitNumber: input.unitNumber },
      });
      if (existing && existing.id !== id) {
        throw new DuplicateUnitError();
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: input,
      select: {
        id: true, name: true, username: true, phone: true,
        role: true, address: true, unitNumber: true, avatarUrl: true,
        isActive: true, createdAt: true, updatedAt: true,
      },
    });

    return user;
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: input,
      select: {
        id: true, name: true, username: true, phone: true,
        role: true, address: true, unitNumber: true, avatarUrl: true,
        isActive: true, createdAt: true, updatedAt: true,
      },
    });

    return user;
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User');
    }

    const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Password lama salah');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, AUTH.BCRYPT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async resetPassword(userId: string, input: ResetPasswordInput) {
    logger.step(1, 'Validating user exists', { userId });
    await this.findById(userId);

    const passwordHash = await bcrypt.hash(input.newPassword, AUTH.BCRYPT_ROUNDS);
    logger.debug('Password hashed successfully', {
      passwordHashLength: passwordHash.length,
    });

    logger.step(3, 'Updating user in database');
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    logger.debug('User password updated', {
      userId: updated.id,
      username: updated.username,
    });
  }

  async toggleActive(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true, name: true, username: true, phone: true,
        role: true, address: true, unitNumber: true, avatarUrl: true,
        isActive: true, createdAt: true, updatedAt: true,
      },
    });

    return updated;
  }
}

export const userService = new UserService();
