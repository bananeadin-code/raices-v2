import { Router } from 'express';
import { asyncHandler } from '../../utils/http';
import { auth, requirePermiso } from '../../middleware/auth';
import * as controller from './roles.controller';

const router = Router();
router.use(auth);

router.get('/', requirePermiso('roles:ver'), asyncHandler(controller.listar));
router.get('/:id', requirePermiso('roles:ver'), asyncHandler(controller.obtener));
router.post('/', requirePermiso('roles:crear'), asyncHandler(controller.crear));
router.put('/:id', requirePermiso('roles:editar'), asyncHandler(controller.actualizar));
router.delete('/:id', requirePermiso('roles:eliminar'), asyncHandler(controller.eliminar));

router.get('/:id/permisos', requirePermiso('roles:ver'), asyncHandler(controller.getPermisos));
router.put('/:id/permisos', requirePermiso('roles:editar'), asyncHandler(controller.setPermisos));

export default router;
