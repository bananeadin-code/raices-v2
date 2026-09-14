import { Router } from 'express';
import { asyncHandler } from '../../utils/http';
import { authJefe } from '../../middleware/auth';
import * as controller from './jefe.controller';

const router = Router();

// Público: entrada al panel del jefe (credencial propia, fuera de usuarios/roles).
router.post('/login', asyncHandler(controller.login));

// Todo lo demás exige el token del jefe.
router.get('/me', authJefe, asyncHandler(controller.me));
router.get('/reporte', authJefe, asyncHandler(controller.reporte));
router.put('/credenciales', authJefe, asyncHandler(controller.cambiarCredenciales));

export default router;
