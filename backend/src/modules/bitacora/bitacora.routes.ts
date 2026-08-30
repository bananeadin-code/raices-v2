import { Router } from 'express';
import { asyncHandler } from '../../utils/http';
import { auth, requirePermiso } from '../../middleware/auth';
import * as controller from './bitacora.controller';

const router = Router();
router.use(auth);
router.get('/', requirePermiso('bitacora:ver'), asyncHandler(controller.listar));

export default router;
