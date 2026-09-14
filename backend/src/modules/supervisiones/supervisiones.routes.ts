import { Router } from 'express';
import { asyncHandler } from '../../utils/http';
import { auth, requirePermiso } from '../../middleware/auth';
import * as controller from './supervisiones.controller';

const router = Router();
router.use(auth);

router.get('/', requirePermiso('supervision:ver'), asyncHandler(controller.listar));
router.post('/', requirePermiso('supervision:crear'), asyncHandler(controller.crear));

export default router;
