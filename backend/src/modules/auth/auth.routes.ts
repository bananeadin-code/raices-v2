import { Router } from 'express';
import { asyncHandler } from '../../utils/http';
import { auth } from '../../middleware/auth';
import * as controller from './auth.controller';

const router = Router();
router.post('/login', asyncHandler(controller.login));
router.get('/me', auth, asyncHandler(controller.me));
export default router;
