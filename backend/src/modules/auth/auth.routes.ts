import { Router } from 'express';
import { asyncHandler } from '../../utils/http';
import { auth } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rateLimit';
import * as controller from './auth.controller';

const router = Router();
// Máx. 10 intentos de login por IP cada 15 minutos.
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, msg: 'Demasiados intentos de inicio de sesión. Espera unos minutos.' });
router.post('/login', loginLimiter, asyncHandler(controller.login));
router.get('/me', auth, asyncHandler(controller.me));
export default router;
