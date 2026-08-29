import { Router } from 'express';
import { asyncHandler } from '../../utils/http';
import { auth, requirePermiso } from '../../middleware/auth';
import * as controller from './usuarios.controller';

const router = Router();
router.use(auth);

router.get('/', requirePermiso('usuarios:ver'), asyncHandler(controller.listar));
router.get('/:id', requirePermiso('usuarios:ver'), asyncHandler(controller.obtener));
router.post('/', requirePermiso('usuarios:crear'), asyncHandler(controller.crear));
router.put('/:id', requirePermiso('usuarios:editar'), asyncHandler(controller.actualizar));
router.delete('/:id', requirePermiso('usuarios:eliminar'), asyncHandler(controller.eliminar));

export default router;
