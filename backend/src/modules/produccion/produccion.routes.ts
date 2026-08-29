import { Router } from 'express';
import { asyncHandler } from '../../utils/http';
import { auth, requirePermiso } from '../../middleware/auth';
import * as controller from './produccion.controller';

const router = Router();
router.use(auth);

router.get('/', requirePermiso('produccion:ver'), asyncHandler(controller.listar));
router.post('/', requirePermiso('produccion:crear'), asyncHandler(controller.crear));
router.put('/:id/estado', requirePermiso('produccion:editar'), asyncHandler(controller.cambiarEstado));

export default router;
