import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes';
import clientesRoutes from './modules/clientes/clientes.routes';
import categoriasRoutes from './modules/categorias/categorias.routes';
import articulosRoutes from './modules/articulos/articulos.routes';
import materiasRoutes from './modules/materias/materias.routes';
import sucursalesRoutes from './modules/sucursales/sucursales.routes';
import usuariosRoutes from './modules/usuarios/usuarios.routes';
import rolesRoutes from './modules/roles/roles.routes';
import inventarioRoutes from './modules/inventario/inventario.routes';
import produccionRoutes from './modules/produccion/produccion.routes';
import bitacoraRoutes from './modules/bitacora/bitacora.routes';

export const router = Router();

router.use('/auth', authRoutes);

// Catálogos
router.use('/clientes', clientesRoutes);
router.use('/categorias', categoriasRoutes);
router.use('/articulos', articulosRoutes);
router.use('/materias', materiasRoutes);
router.use('/sucursales', sucursalesRoutes);

// Acceso
router.use('/usuarios', usuariosRoutes);
router.use('/roles', rolesRoutes);

// Inventario y producción
router.use('/inventario', inventarioRoutes);
router.use('/produccion', produccionRoutes);
router.use('/bitacora', bitacoraRoutes);

// Conforme construyas cada módulo, móntalo aquí:
// router.use('/pos', posRoutes);
// router.use('/produccion', produccionRoutes);
// router.use('/cobranza', cobranzaRoutes);
// router.use('/reportes', reportesRoutes);
