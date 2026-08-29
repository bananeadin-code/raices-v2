import { Router } from 'express';
import { asyncHandler } from '../../utils/http';
import { auth, requirePermiso } from '../../middleware/auth';
import * as controller from './clientes.controller';

const router = Router();
router.use(auth); // todas las rutas de clientes requieren sesión

router.get('/', requirePermiso('clientes:ver'), asyncHandler(controller.listar));
router.get('/:id', requirePermiso('clientes:ver'), asyncHandler(controller.obtener));
router.post('/', requirePermiso('clientes:crear'), asyncHandler(controller.crear));
router.put('/:id', requirePermiso('clientes:editar'), asyncHandler(controller.actualizar));
router.delete('/:id', requirePermiso('clientes:eliminar'), asyncHandler(controller.eliminar));

export default router;
