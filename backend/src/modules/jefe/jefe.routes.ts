import { Router } from 'express';
import { asyncHandler } from '../../utils/http';
import { authJefe } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rateLimit';
import * as controller from './jefe.controller';

const router = Router();

// Público: entrada al panel del jefe (credencial propia, fuera de usuarios/roles).
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, msg: 'Demasiados intentos. Espera unos minutos.' });
router.post('/login', loginLimiter, asyncHandler(controller.login));

// Todo lo demás exige el token del jefe.
router.get('/me', authJefe, asyncHandler(controller.me));
router.get('/reporte', authJefe, asyncHandler(controller.reporte));
router.put('/credenciales', authJefe, asyncHandler(controller.cambiarCredenciales));

export default router;
