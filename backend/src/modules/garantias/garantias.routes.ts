import { Router } from 'express';
import { asyncHandler } from '../../utils/http';
import { auth, requirePermiso } from '../../middleware/auth';
import * as controller from './garantias.controller';

const router = Router();
router.use(auth);

router.get('/', requirePermiso('garantias:ver'), asyncHandler(controller.listar));
router.get('/:id', requirePermiso('garantias:ver'), asyncHandler(controller.obtener));
router.post('/', requirePermiso('garantias:crear'), asyncHandler(controller.crear));
router.put('/:id', requirePermiso('garantias:editar'), asyncHandler(controller.actualizar));
router.delete('/:id', requirePermiso('garantias:eliminar'), asyncHandler(controller.eliminar));

export default router;
