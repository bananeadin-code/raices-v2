import { Router } from 'express';
import { asyncHandler } from '../../utils/http';
import { auth, requirePermiso } from '../../middleware/auth';
import * as controller from './caja.controller';

const router = Router();
router.use(auth);

// Categorías (catálogo de gastos/ingresos)
router.get('/categorias', requirePermiso('caja:ver'), asyncHandler(controller.listarCategorias));
router.post('/categorias', requirePermiso('caja:crear'), asyncHandler(controller.crearCategoria));
router.put('/categorias/:id', requirePermiso('caja:editar'), asyncHandler(controller.actualizarCategoria));
router.delete('/categorias/:id', requirePermiso('caja:eliminar'), asyncHandler(controller.eliminarCategoria));

// Movimientos de dinero
router.get('/movimientos', requirePermiso('caja:ver'), asyncHandler(controller.listarMovimientos));
router.post('/movimientos', requirePermiso('caja:crear'), asyncHandler(controller.crearMovimiento));
router.delete('/movimientos/:id', requirePermiso('caja:eliminar'), asyncHandler(controller.eliminarMovimiento));

export default router;
