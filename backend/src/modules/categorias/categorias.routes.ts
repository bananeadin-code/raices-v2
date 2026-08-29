import { Router } from 'express';
import { asyncHandler } from '../../utils/http';
import { auth, requirePermiso } from '../../middleware/auth';
import * as controller from './categorias.controller';

const router = Router();
router.use(auth);

router.get('/', requirePermiso('categorias:ver'), asyncHandler(controller.listar));
router.get('/:id', requirePermiso('categorias:ver'), asyncHandler(controller.obtener));
router.post('/', requirePermiso('categorias:crear'), asyncHandler(controller.crear));
router.put('/:id', requirePermiso('categorias:editar'), asyncHandler(controller.actualizar));
router.delete('/:id', requirePermiso('categorias:eliminar'), asyncHandler(controller.eliminar));

export default router;
