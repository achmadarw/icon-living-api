import { describe, it, expect, vi } from 'vitest';
import type { Response } from 'express';
import { sendSuccess, sendCreated, sendNoContent, sendError, buildPaginationMeta } from '../../utils/response';

function createMockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('sendSuccess', () => {
  it('should send 200 with success response', () => {
    const res = createMockResponse();
    sendSuccess(res, { id: '123', name: 'Test' });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: '123', name: 'Test' },
    });
  });

  it('should send custom status code', () => {
    const res = createMockResponse();
    sendSuccess(res, { id: '123' }, 201);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should include pagination meta when provided', () => {
    const res = createMockResponse();
    const meta = { page: 1, limit: 20, total: 50, totalPages: 3 };
    sendSuccess(res, [{ id: '1' }], 200, meta);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ id: '1' }],
      meta,
    });
  });

  it('should not include meta when not provided', () => {
    const res = createMockResponse();
    sendSuccess(res, { id: '123' });

    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall).not.toHaveProperty('meta');
  });
});

describe('sendCreated', () => {
  it('should send 201 with created data', () => {
    const res = createMockResponse();
    sendCreated(res, { id: '123' });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: '123' },
    });
  });
});

describe('sendNoContent', () => {
  it('should send 204 with no body', () => {
    const res = createMockResponse();
    sendNoContent(res);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});

describe('sendError', () => {
  it('should send error response with correct structure', () => {
    const res = createMockResponse();
    sendError(res, 400, 'VALIDATION_ERROR', 'Field is required');

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Field is required',
      },
    });
  });

  it('should include details when provided', () => {
    const res = createMockResponse();
    sendError(res, 400, 'VALIDATION_ERROR', 'Invalid data', { fields: { name: 'required' } });

    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.error.details).toEqual({ fields: { name: 'required' } });
  });

  it('should not include details when not provided', () => {
    const res = createMockResponse();
    sendError(res, 500, 'INTERNAL_ERROR', 'Server error');

    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.error).not.toHaveProperty('details');
  });
});

describe('buildPaginationMeta', () => {
  it('should calculate totalPages correctly', () => {
    expect(buildPaginationMeta(1, 20, 50)).toEqual({
      page: 1,
      limit: 20,
      total: 50,
      totalPages: 3,
    });
  });

  it('should handle exact division', () => {
    expect(buildPaginationMeta(1, 20, 40)).toEqual({
      page: 1,
      limit: 20,
      total: 40,
      totalPages: 2,
    });
  });

  it('should handle zero total', () => {
    expect(buildPaginationMeta(1, 20, 0)).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it('should handle single page', () => {
    expect(buildPaginationMeta(1, 20, 5)).toEqual({
      page: 1,
      limit: 20,
      total: 5,
      totalPages: 1,
    });
  });
});
