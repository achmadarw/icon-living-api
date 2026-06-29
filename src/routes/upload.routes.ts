import { Router, type Router as RouterType } from 'express';
import { uploadController } from '../controllers/upload.controller';
import { authenticate } from '../middleware/authenticate';
import { imageUpload } from '../middleware/upload-file';

const router: RouterType = Router();

router.use(authenticate);

router.post('/', imageUpload.single('file'), (req, res, next) =>
  uploadController.upload(req, res, next),
);

export default router;
