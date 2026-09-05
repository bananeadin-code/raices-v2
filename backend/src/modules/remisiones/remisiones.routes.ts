import { Router } from 'express';
import { asyncHandler } from '../../utils/http';
import { auth, requirePermiso } from '../../middleware/auth';
import * as controller from './remisiones.controller';

const router = Router();
router.use(auth);

router.get('/', requirePermiso('remisiones:ver'), asyncHandler(controller.listar));
router.get('/:id', requirePermiso('remisiones:ver'), asyncHandler(controller.obtener));
router.post('/', requirePermiso('remisiones:crear'), asyncHandler(controller.crear));
router.put('/:id/estado', requirePermiso('remisiones:editar'), asyncHandler(controller.cambiarEstado));

export default router;
