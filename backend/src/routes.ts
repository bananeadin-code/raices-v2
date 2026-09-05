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
import garantiasRoutes from './modules/garantias/garantias.routes';
import ventasRoutes from './modules/ventas/ventas.routes';
import remisionesRoutes from './modules/remisiones/remisiones.routes';
import bitacoraRoutes from './modules/bitacora/bitacora.routes';

export const router = Router();

router.use('/auth', authRoutes);

// Catálogos
router.use('/clientes', clientesRoutes);
router.use('/categorias', categoriasRoutes);
router.use('/articulos', articulosRoutes);
router.use('/materias', materiasRoutes);
router.use('/sucursales', sucursalesRoutes);
router.use('/garantias', garantiasRoutes);

// Punto de venta
router.use('/ventas', ventasRoutes);
router.use('/remisiones', remisionesRoutes);

// Acceso
router.use('/usuarios', usuariosRoutes);
router.use('/roles', rolesRoutes);

// Inventario y producción
router.use('/inventario', inventarioRoutes);
router.use('/produccion', produccionRoutes);
router.use('/bitacora', bitacoraRoutes);

// Conforme construyas cada módulo, móntalo aquí:
// router.use('/reportes', reportesRoutes);
