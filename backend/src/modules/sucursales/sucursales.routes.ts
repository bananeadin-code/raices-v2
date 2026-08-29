import { Router } from 'express';
import { asyncHandler } from '../../utils/http';
import { auth, requirePermiso } from '../../middleware/auth';
import * as controller from './sucursales.controller';

const router = Router();
router.use(auth);

router.get('/', requirePermiso('sucursales:ver'), asyncHandler(controller.listar));
router.get('/:id', requirePermiso('sucursales:ver'), asyncHandler(controller.obtener));
router.post('/', requirePermiso('sucursales:crear'), asyncHandler(controller.crear));
router.put('/:id', requirePermiso('sucursales:editar'), asyncHandler(controller.actualizar));
router.delete('/:id', requirePermiso('sucursales:eliminar'), asyncHandler(controller.eliminar));

export default router;
