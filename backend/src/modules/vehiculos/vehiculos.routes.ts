import { Router } from 'express';
import { asyncHandler } from '../../utils/http';
import { auth, requirePermiso } from '../../middleware/auth';
import * as controller from './vehiculos.controller';

const router = Router();
router.use(auth);

router.get('/', requirePermiso('vehiculos:ver'), asyncHandler(controller.listar));
router.post('/', requirePermiso('vehiculos:crear'), asyncHandler(controller.crear));
router.put('/:id', requirePermiso('vehiculos:editar'), asyncHandler(controller.actualizar));
router.delete('/:id', requirePermiso('vehiculos:eliminar'), asyncHandler(controller.eliminar));

// Bitácora del vehículo
router.get('/:id/notas', requirePermiso('vehiculos:ver'), asyncHandler(controller.listarNotas));
router.post('/:id/notas', requirePermiso('vehiculos:editar'), asyncHandler(controller.agregarNota));

export default router;
