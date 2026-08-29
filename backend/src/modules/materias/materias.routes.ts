import { Router } from 'express';
import { asyncHandler } from '../../utils/http';
import { auth, requirePermiso } from '../../middleware/auth';
import * as controller from './materias.controller';

const router = Router();
router.use(auth);

router.get('/', requirePermiso('materias:ver'), asyncHandler(controller.listar));
router.get('/:id', requirePermiso('materias:ver'), asyncHandler(controller.obtener));
router.post('/', requirePermiso('materias:crear'), asyncHandler(controller.crear));
router.put('/:id', requirePermiso('materias:editar'), asyncHandler(controller.actualizar));
router.delete('/:id', requirePermiso('materias:eliminar'), asyncHandler(controller.eliminar));

export default router;
