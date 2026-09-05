import { Router } from 'express';
import { asyncHandler } from '../../utils/http';
import { auth, requirePermiso } from '../../middleware/auth';
import * as controller from './ventas.controller';

const router = Router();
router.use(auth);

// /cobranza va ANTES de /:id para que no lo capture como id.
router.get('/cobranza', requirePermiso('cobranza:ver'), asyncHandler(controller.cobranza));

router.get('/', requirePermiso('pos:ver'), asyncHandler(controller.listar));
router.get('/:id', requirePermiso('pos:ver'), asyncHandler(controller.obtener));
router.post('/', requirePermiso('pos:crear'), asyncHandler(controller.crear));
router.put('/:id/confirmar', requirePermiso('pos:editar'), asyncHandler(controller.confirmar));
router.put('/:id/cancelar', requirePermiso('pos:editar'), asyncHandler(controller.cancelar));
router.post('/:id/abonos', requirePermiso('abonos:crear'), asyncHandler(controller.abonar));

export default router;
