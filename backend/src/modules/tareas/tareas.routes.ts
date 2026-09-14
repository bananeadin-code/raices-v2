import { Router } from 'express';
import { asyncHandler } from '../../utils/http';
import { auth, requirePermiso } from '../../middleware/auth';
import * as controller from './tareas.controller';

const router = Router();
router.use(auth);

router.get('/', requirePermiso('tareas:ver'), asyncHandler(controller.listar));
router.post('/', requirePermiso('tareas:crear'), asyncHandler(controller.crear));
router.put('/:id/accion', requirePermiso('tareas:editar'), asyncHandler(controller.accion));

export default router;
