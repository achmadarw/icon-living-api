import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import { UploadService } from '../services/upload.service';

vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));

const service = new UploadService();

describe('UploadService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateFile', () => {
    it('should accept valid mime types', () => {
      expect(() => service.validateFile('image/jpeg', 1000)).not.toThrow();
      expect(() => service.validateFile('image/png', 1000)).not.toThrow();
      expect(() => service.validateFile('image/webp', 1000)).not.toThrow();
    });

    it('should reject invalid mime type', () => {
      expect(() => service.validateFile('application/pdf', 1000))
        .toThrow('Tipe file tidak diizinkan');
    });

    it('should reject file too large', () => {
      expect(() => service.validateFile('image/jpeg', 10 * 1024 * 1024))
        .toThrow('Ukuran file maksimal');
    });
  });

  describe('saveFile', () => {
    it('should save file and return URL', async () => {
      const buffer = Buffer.from('test');
      const url = await service.saveFile(buffer, 'image/jpeg', 'test.jpg');

      expect(url).toMatch(/^\/uploads\/\d+-[a-f0-9]+\.jpg$/);
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });
});
