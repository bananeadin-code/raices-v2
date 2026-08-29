import { Router } from 'express';
import { asyncHandler } from '../../utils/http';
import { auth, requirePermiso } from '../../middleware/auth';
import * as controller from './inventario.controller';

const router = Router();
router.use(auth);

router.get('/existencias', requirePermiso('inventario:ver'), asyncHandler(controller.existencias));
router.get('/kardex', requirePermiso('inventario:ver'), asyncHandler(controller.kardex));
router.post('/movimiento', requirePermiso('inventario:editar'), asyncHandler(controller.movimiento));
router.post('/traspaso', requirePermiso('inventario:editar'), asyncHandler(controller.traspaso));

export default router;
