import { prisma } from '../lib/prisma';
import { NotFoundError } from '../utils/errors';
import type {
  CreateMessageTemplateInput,
  UpdateMessageTemplateInput,
  TemplateVariable,
} from '@tia/shared';
import type { Prisma } from '@prisma/client';

export interface MessageTemplateResponse {
  id: string;
  name: string;
  body: string;
  variables: TemplateVariable[];
  createdById: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toResponse(t: {
  id: string;
  name: string;
  body: string;
  variables: Prisma.JsonValue;
  createdById: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
}): MessageTemplateResponse {
  return {
    id: t.id,
    name: t.name,
    body: t.body,
    variables: Array.isArray(t.variables) ? (t.variables as unknown as TemplateVariable[]) : [],
    createdById: t.createdById,
    createdByName: t.createdByName,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export class MessageTemplateService {
  async list(): Promise<MessageTemplateResponse[]> {
    const items = await prisma.messageTemplate.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return items.map(toResponse);
  }

  async create(
    input: CreateMessageTemplateInput,
    actorId: string,
  ): Promise<MessageTemplateResponse> {
    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { name: true },
    });
    const created = await prisma.messageTemplate.create({
      data: {
        name: input.name,
        body: input.body,
        variables: (input.variables ?? []) as unknown as Prisma.InputJsonValue,
        createdById: actorId,
        createdByName: actor?.name ?? null,
      },
    });
    return toResponse(created);
  }

  async update(id: string, input: UpdateMessageTemplateInput): Promise<MessageTemplateResponse> {
    const existing = await prisma.messageTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Template pesan tidak ditemukan');

    const updated = await prisma.messageTemplate.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
        ...(input.variables !== undefined
          ? { variables: input.variables as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });
    return toResponse(updated);
  }

  async remove(id: string): Promise<void> {
    const existing = await prisma.messageTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Template pesan tidak ditemukan');
    await prisma.messageTemplate.delete({ where: { id } });
  }
}

export const messageTemplateService = new MessageTemplateService();
