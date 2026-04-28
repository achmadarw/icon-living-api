import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { AppError } from '../utils/errors';
import { UPLOAD } from '@tia/shared';
import { config } from '../config';  // tambah ini

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

export class UploadService {
  async ensureUploadDir() {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }

  validateFile(mimetype: string, size: number) {
    if (!UPLOAD.ALLOWED_MIME_TYPES.includes(mimetype as any)) {
      throw new AppError(400, 'INVALID_FILE_TYPE', `Tipe file tidak diizinkan. Hanya ${UPLOAD.ALLOWED_MIME_TYPES.join(', ')}`);
    }
    if (size > UPLOAD.MAX_FILE_SIZE) {
      throw new AppError(400, 'FILE_TOO_LARGE', `Ukuran file maksimal ${UPLOAD.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }
  }

  async saveFile(buffer: Buffer, mimetype: string, originalName: string): Promise<string> {
    await this.ensureUploadDir();

    const ext = path.extname(originalName) || this.getExtFromMime(mimetype);
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    await fs.writeFile(filepath, buffer);

    const baseUrl = this.getBaseUrl();
    return `${baseUrl}/uploads/${filename}`;
  }

  private getBaseUrl(): string {
    if (config.isProduction) {
      // Di production, set APP_URL di .env
      return process.env.APP_URL ?? 'https://api.tia-acropolis.com';
    }
    // Di development, gunakan host lokal dengan port dari config
    return `http://localhost:${config.port}`;
  }

  private getExtFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    return map[mime] ?? '.bin';
  }
}

export const uploadService = new UploadService();
