import type { Request, Response, NextFunction } from 'express';
import { uploadService } from '../services/upload.service';
import { sendCreated } from '../utils/response';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export class UploadController {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('📤 FILE UPLOAD REQUEST');

      // Support both multipart FormData and raw binary
      let fileBuffer: Buffer | undefined;
      let contentType: string = '';
      let filename: string = 'upload';

      // Handle FormData (multipart/form-data) from mobile/web
      if (req.file) {
        logger.step(1, 'Processing FormData upload', {
          fieldName: req.file.fieldname,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
        });
        
        fileBuffer = req.file.buffer;
        contentType = req.file.mimetype;
        filename = req.file.originalname;
      } // Handle raw binary upload
      else if (req.body && Buffer.isBuffer(req.body)) {
        logger.step(1, 'Processing raw binary upload', {
          size: req.body.length,
          contentType: req.headers['content-type'],
        });
        
        fileBuffer = req.body;
        contentType = (req.headers['content-type'] as string) ?? '';
        filename = (req.headers['x-filename'] as string) ?? 'upload';
      }

      if (!fileBuffer) {
        logger.warn('No file data found in request');
        throw new AppError(400, 'VALIDATION_ERROR', 'File tidak ditemukan dalam request');
      }

      logger.step(2, 'Validating file', {
        contentType,
        size: fileBuffer.length,
      });

      uploadService.validateFile(contentType, fileBuffer.length);

      logger.step(3, 'Saving file to storage');

      const url = await uploadService.saveFile(fileBuffer, contentType, filename);

      logger.success('✅ FILE UPLOAD SUCCESSFUL', { url });

      sendCreated(res, { url });
    } catch (err) {
      logger.error('❌ FILE UPLOAD FAILED', err);
      next(err);
    }
  }
}

export const uploadController = new UploadController();
