import multer from 'multer';
import { UPLOAD } from '@tia/shared';

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (UPLOAD.ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
      cb(null, true);
      return;
    }
    cb(new Error(`File type ${file.mimetype} not allowed`));
  },
});
