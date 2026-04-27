import { Router, raw, type Router as RouterType } from 'express';
import multer from 'multer';
import { uploadController } from '../controllers/upload.controller';
import { authenticate } from '../middleware/authenticate';
import { UPLOAD } from '@tia/shared';

const router: RouterType = Router();

router.use(authenticate);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD.MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (UPLOAD.ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

router.post('/', upload.single('file'), (req, res, next) =>
  uploadController.upload(req, res, next),
);

export default router;
