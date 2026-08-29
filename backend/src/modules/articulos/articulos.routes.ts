import { Router } from 'express';
import { asyncHandler } from '../../utils/http';
import { auth, requirePermiso } from '../../middleware/auth';
import * as controller from './articulos.controller';

const router = Router();
router.use(auth);

router.get('/', requirePermiso('articulos:ver'), asyncHandler(controller.listar));
router.get('/:id', requirePermiso('articulos:ver'), asyncHandler(controller.obtener));
router.post('/', requirePermiso('articulos:crear'), asyncHandler(controller.crear));
router.put('/:id', requirePermiso('articulos:editar'), asyncHandler(controller.actualizar));
router.delete('/:id', requirePermiso('articulos:eliminar'), asyncHandler(controller.eliminar));

// Receta / BOM del artículo
router.get('/:id/receta', requirePermiso('articulos:ver'), asyncHandler(controller.getReceta));
router.put('/:id/receta', requirePermiso('articulos:editar'), asyncHandler(controller.setReceta));

export default router;
