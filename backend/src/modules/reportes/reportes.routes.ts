import { Router } from 'express';
import { asyncHandler } from '../../utils/http';
import { auth, requirePermiso } from '../../middleware/auth';
import * as controller from './reportes.controller';

const router = Router();
router.use(auth);

router.get('/dia', requirePermiso('reportes:ver'), asyncHandler(controller.dia));

export default router;
