-- ============================================================
--  Esquema de base de datos - Sistema Raices Duranguenses v2
--  MySQL 8+ / InnoDB / utf8mb4
--  Diseñado para paridad con el sistema actual + regularizaciones:
--    - Inventario multi-almacen real (producto Y materia con sucursal)
--    - Ventas con estado (pendiente reserva stock; adios sucursal "PENDIENTES")
--    - Folios atomicos por sucursal (sin duplicados)
--    - Credito + abonos + cobranza integros
--    - Produccion con receta/BOM en transaccion
--    - Passwords con hash, permisos por modulo, todo transaccional
-- ============================================================
SET NAMES utf8mb4;
SET sql_mode = 'STRICT_ALL_TABLES';

-- ==========================================================
-- 1) ORGANIZACION Y ACCESO
-- ==========================================================
CREATE TABLE sucursales (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  abreviatura    VARCHAR(10)  NULL,
  tipo           ENUM('tienda','almacen','fabrica','mixto') NOT NULL DEFAULT 'mixto',
  calle          VARCHAR(150) NULL,
  numero         VARCHAR(30)  NULL,
  colonia        VARCHAR(120) NULL,
  cp             VARCHAR(10)  NULL,
  ciudad         VARCHAR(100) NULL,
  telefono       VARCHAR(50)  NULL,
  activo         TINYINT(1) NOT NULL DEFAULT 1,
  creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE roles (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(50) NOT NULL UNIQUE,   -- 'administrador', 'operativo', ...
  descripcion VARCHAR(200) NULL
) ENGINE=InnoDB;

-- Permisos por modulo (reemplaza el 'menu'/'nivel' del sistema viejo)
CREATE TABLE rol_permisos (
  id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rol_id   INT UNSIGNED NOT NULL,
  modulo   VARCHAR(50) NOT NULL,  -- 'pos','inventario','produccion','cobranza','reportes',...
  ver      TINYINT(1) NOT NULL DEFAULT 0,
  crear    TINYINT(1) NOT NULL DEFAULT 0,
  editar   TINYINT(1) NOT NULL DEFAULT 0,
  eliminar TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_rol_modulo (rol_id, modulo),
  CONSTRAINT fk_permiso_rol FOREIGN KEY (rol_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE TABLE usuarios (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario        VARCHAR(60)  NOT NULL UNIQUE,
  nombre         VARCHAR(120) NOT NULL,
  apellidos      VARCHAR(120) NULL,
  email          VARCHAR(150) NULL,
  telefono       VARCHAR(50)  NULL,
  password_hash  VARCHAR(255) NOT NULL,       -- bcrypt/argon2
  rol_id         INT UNSIGNED NOT NULL,
  sucursal_id    INT UNSIGNED NULL,           -- sucursal por defecto del usuario
  activo         TINYINT(1) NOT NULL DEFAULT 1,
  ultimo_acceso  DATETIME NULL,
  creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuario_rol      FOREIGN KEY (rol_id)      REFERENCES roles(id),
  CONSTRAINT fk_usuario_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
) ENGINE=InnoDB;

-- ==========================================================
-- 2) CATALOGOS
-- ==========================================================
CREATE TABLE categorias (
  id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE clientes (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(160) NOT NULL,
  telefono       VARCHAR(50)  NULL,
  email          VARCHAR(150) NULL,
  rfc            VARCHAR(20)  NULL,
  calle          VARCHAR(150) NULL,
  numero         VARCHAR(30)  NULL,
  colonia        VARCHAR(120) NULL,
  cp             VARCHAR(10)  NULL,
  ciudad         VARCHAR(100) NULL,
  limite_credito DECIMAL(12,2) NOT NULL DEFAULT 0,
  -- Datos fiscales (opcionales, para agilizar facturacion externa)
  razon_social   VARCHAR(200) NULL,
  regimen_fiscal VARCHAR(10)  NULL,
  uso_cfdi       VARCHAR(10)  NULL,
  cp_fiscal      VARCHAR(10)  NULL,
  email_fiscal   VARCHAR(150) NULL,
  activo         TINYINT(1) NOT NULL DEFAULT 1,
  creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cliente_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE articulos (            -- producto terminado / mercancia
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku            VARCHAR(40)  NULL UNIQUE,
  nombre         VARCHAR(160) NOT NULL,
  categoria_id   INT UNSIGNED NULL,
  precio         DECIMAL(12,2) NOT NULL DEFAULT 0,
  costo          DECIMAL(12,2) NOT NULL DEFAULT 0,
  es_producible  TINYINT(1) NOT NULL DEFAULT 0,  -- se fabrica (tiene receta)
  minimo         INT NULL,
  maximo         INT NULL,
  reorden        INT NULL,
  activo         TINYINT(1) NOT NULL DEFAULT 1,
  creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_articulo_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id),
  INDEX idx_articulo_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE materias (             -- materia prima / insumo
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo         VARCHAR(40)  NULL UNIQUE,
  nombre         VARCHAR(160) NOT NULL,
  unidad         VARCHAR(20)  NOT NULL DEFAULT 'pza',  -- pza, kg, lt, m, ...
  costo          DECIMAL(12,2) NOT NULL DEFAULT 0,
  minimo         DECIMAL(12,3) NULL,
  activo         TINYINT(1) NOT NULL DEFAULT 1,
  creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_materia_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE vehiculos (
  id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  placas VARCHAR(20)  NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

-- Receta / BOM: materiales que consume un articulo producible
-- (reemplaza 'articulos2materias' del sistema viejo)
CREATE TABLE articulo_receta (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  articulo_id INT UNSIGNED NOT NULL,
  materia_id  INT UNSIGNED NOT NULL,
  cantidad    DECIMAL(12,3) NOT NULL,          -- cuanto de esa materia por 1 unidad producida
  UNIQUE KEY uq_receta (articulo_id, materia_id),
  CONSTRAINT fk_receta_articulo FOREIGN KEY (articulo_id) REFERENCES articulos(id),
  CONSTRAINT fk_receta_materia  FOREIGN KEY (materia_id)  REFERENCES materias(id)
) ENGINE=InnoDB;

-- ==========================================================
-- 3) INVENTARIO (multi-almacen)
-- ==========================================================
-- Libro de movimientos = fuente de verdad. Exactamente uno de (articulo_id, materia_id).
CREATE TABLE movimientos_inventario (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sucursal_id    INT UNSIGNED NOT NULL,
  articulo_id    INT UNSIGNED NULL,
  materia_id     INT UNSIGNED NULL,
  cantidad       DECIMAL(12,3) NOT NULL,       -- (+) entrada / (-) salida
  tipo           ENUM('entrada','salida','venta','ajuste','traspaso','prod_consumo','prod_alta') NOT NULL,
  referencia_tipo VARCHAR(20) NULL,            -- 'venta','produccion','traspaso','ajuste'
  referencia_id  BIGINT UNSIGNED NULL,
  motivo         VARCHAR(200) NULL,
  usuario_id     INT UNSIGNED NOT NULL,
  fecha          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mov_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id),
  CONSTRAINT fk_mov_articulo FOREIGN KEY (articulo_id) REFERENCES articulos(id),
  CONSTRAINT fk_mov_materia  FOREIGN KEY (materia_id)  REFERENCES materias(id),
  CONSTRAINT fk_mov_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id),
  CONSTRAINT chk_mov_item CHECK (
    (articulo_id IS NOT NULL AND materia_id IS NULL) OR
    (articulo_id IS NULL AND materia_id IS NOT NULL)
  ),
  INDEX idx_mov_art (articulo_id, sucursal_id),
  INDEX idx_mov_mat (materia_id, sucursal_id),
  INDEX idx_mov_ref (referencia_tipo, referencia_id),
  INDEX idx_mov_fecha (fecha)
) ENGINE=InnoDB;

-- Existencias = cache de stock por item y sucursal (se actualiza en la MISMA transaccion
-- que el movimiento). Evita recalcular sobre miles de renglones en cada reporte.
--   disponible = cantidad - reservado
CREATE TABLE existencias (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sucursal_id INT UNSIGNED NOT NULL,
  articulo_id INT UNSIGNED NULL,
  materia_id  INT UNSIGNED NULL,
  cantidad    DECIMAL(12,3) NOT NULL DEFAULT 0,  -- fisico
  reservado   DECIMAL(12,3) NOT NULL DEFAULT 0,  -- comprometido por ventas pendientes
  UNIQUE KEY uq_exist_art (sucursal_id, articulo_id),
  UNIQUE KEY uq_exist_mat (sucursal_id, materia_id),
  CONSTRAINT fk_exist_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id),
  CONSTRAINT fk_exist_articulo FOREIGN KEY (articulo_id) REFERENCES articulos(id),
  CONSTRAINT fk_exist_materia  FOREIGN KEY (materia_id)  REFERENCES materias(id)
) ENGINE=InnoDB;

-- ==========================================================
-- 4) VENTAS / PUNTO DE VENTA
-- ==========================================================
-- Secuencia de folios por sucursal y tipo (se lee con SELECT ... FOR UPDATE -> atomico)
CREATE TABLE folios (
  sucursal_id  INT UNSIGNED NOT NULL,
  tipo         ENUM('venta','remision','produccion') NOT NULL,
  ultimo_folio INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (sucursal_id, tipo),
  CONSTRAINT fk_folio_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
) ENGINE=InnoDB;

CREATE TABLE ventas (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  folio             INT UNSIGNED NOT NULL,
  sucursal_id       INT UNSIGNED NOT NULL,          -- ya NO va hardcodeado
  usuario_id        INT UNSIGNED NOT NULL,
  cliente_id        INT UNSIGNED NULL,              -- NULL = mostrador / publico en general
  fecha             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado            ENUM('pendiente','confirmada','cancelada') NOT NULL DEFAULT 'confirmada',
  metodo_pago       ENUM('efectivo','tarjeta','transferencia','credito') NOT NULL DEFAULT 'efectivo',
  fecha_vencimiento DATE NULL,                      -- solo credito
  subtotal          DECIMAL(12,2) NOT NULL DEFAULT 0,
  descuento         DECIMAL(12,2) NOT NULL DEFAULT 0,
  total             DECIMAL(12,2) NOT NULL DEFAULT 0,
  creado_en         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_venta_folio (sucursal_id, folio),
  CONSTRAINT fk_venta_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id),
  CONSTRAINT fk_venta_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id),
  CONSTRAINT fk_venta_cliente  FOREIGN KEY (cliente_id)  REFERENCES clientes(id),
  INDEX idx_venta_fecha (fecha),
  INDEX idx_venta_estado (estado)
) ENGINE=InnoDB;

CREATE TABLE venta_items (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  venta_id        BIGINT UNSIGNED NOT NULL,
  articulo_id     INT UNSIGNED NOT NULL,
  cantidad        DECIMAL(12,3) NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  importe         DECIMAL(12,2) NOT NULL,
  CONSTRAINT fk_vitem_venta    FOREIGN KEY (venta_id)    REFERENCES ventas(id) ON DELETE CASCADE,
  CONSTRAINT fk_vitem_articulo FOREIGN KEY (articulo_id) REFERENCES articulos(id)
) ENGINE=InnoDB;
-- FLUJO DE STOCK EN VENTAS (en la app, dentro de UNA transaccion):
--   estado 'pendiente'  -> existencias.reservado += cantidad   (retiene stock, no lo consume)
--   'pendiente' -> 'confirmada' -> reservado -= cantidad; cantidad -= cantidad;
--                                  + movimiento tipo 'venta'
--   venta directa 'confirmada' -> cantidad -= cantidad; + movimiento 'venta'
--   'cancelada' -> libera reservado / revierte movimientos

-- ==========================================================
-- 5) CREDITO Y ABONOS  (cobranza)
-- ==========================================================
CREATE TABLE abonos (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  venta_id   BIGINT UNSIGNED NOT NULL,
  monto      DECIMAL(12,2) NOT NULL,
  metodo     ENUM('efectivo','tarjeta','transferencia') NOT NULL DEFAULT 'efectivo',
  fecha      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id INT UNSIGNED NOT NULL,
  referencia VARCHAR(100) NULL,
  CONSTRAINT fk_abono_venta   FOREIGN KEY (venta_id)   REFERENCES ventas(id),
  CONSTRAINT fk_abono_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_abono_venta (venta_id)
) ENGINE=InnoDB;
-- Saldo de una venta a credito = ventas.total - SUM(abonos.monto)
-- Cobranza = ventas con metodo_pago='credito' y saldo > 0 (se calcula, no se duplica)

-- ==========================================================
-- 6) PRODUCCION (con receta/BOM)
-- ==========================================================
CREATE TABLE producciones (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  folio         INT UNSIGNED NULL,
  sucursal_id   INT UNSIGNED NOT NULL,          -- donde se produce (fabrica/almacen)
  articulo_id   INT UNSIGNED NOT NULL,          -- producto fabricado
  cantidad      DECIMAL(12,3) NOT NULL,
  estado        ENUM('en_espera','en_progreso','terminado','cancelado') NOT NULL DEFAULT 'en_espera',
  usuario_id    INT UNSIGNED NOT NULL,
  observaciones VARCHAR(200) NULL,
  fecha         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  creado_en     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_prod_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id),
  CONSTRAINT fk_prod_articulo FOREIGN KEY (articulo_id) REFERENCES articulos(id),
  CONSTRAINT fk_prod_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- Lineas de materia de una orden de produccion (snapshot de la receta al crearla).
CREATE TABLE produccion_materias (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  produccion_id BIGINT UNSIGNED NOT NULL,
  materia_id    INT UNSIGNED NOT NULL,
  cantidad      DECIMAL(12,3) NOT NULL,
  CONSTRAINT fk_pm_produccion FOREIGN KEY (produccion_id) REFERENCES producciones(id) ON DELETE CASCADE,
  CONSTRAINT fk_pm_materia    FOREIGN KEY (materia_id)    REFERENCES materias(id)
) ENGINE=InnoDB;
-- Ciclo de vida (en UNA transaccion cada cambio):
--   crear -> 'en_espera': valida disponible y RESERVA la materia (existencias.reservado += consumo)
--   'en_progreso': sigue reservado, solo cambia el estado
--   'terminado': libera reserva + consume materia (prod_consumo) + da alta el producto (prod_alta)
--   'cancelado': libera la reserva; no consume ni produce

-- ==========================================================
-- 7) REMISIONES (nota de entrega)
-- ==========================================================
CREATE TABLE remisiones (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  folio         INT UNSIGNED NOT NULL,
  sucursal_id   INT UNSIGNED NOT NULL,
  cliente_id    INT UNSIGNED NULL,
  venta_id      BIGINT UNSIGNED NULL,            -- opcional: remision ligada a una venta
  fecha         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado        ENUM('pendiente','entregada','cancelada') NOT NULL DEFAULT 'pendiente',
  usuario_id    INT UNSIGNED NOT NULL,
  observaciones VARCHAR(200) NULL,
  UNIQUE KEY uq_remision_folio (sucursal_id, folio),
  CONSTRAINT fk_rem_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id),
  CONSTRAINT fk_rem_cliente  FOREIGN KEY (cliente_id)  REFERENCES clientes(id),
  CONSTRAINT fk_rem_venta    FOREIGN KEY (venta_id)    REFERENCES ventas(id),
  CONSTRAINT fk_rem_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE remision_items (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  remision_id BIGINT UNSIGNED NOT NULL,
  articulo_id INT UNSIGNED NOT NULL,
  cantidad    DECIMAL(12,3) NOT NULL,
  CONSTRAINT fk_ritem_remision FOREIGN KEY (remision_id) REFERENCES remisiones(id) ON DELETE CASCADE,
  CONSTRAINT fk_ritem_articulo FOREIGN KEY (articulo_id) REFERENCES articulos(id)
) ENGINE=InnoDB;

-- ==========================================================
-- 8) TAREAS Y SUPERVISION
-- ==========================================================
-- Asignacion de tareas a usuarios (sin foto/mapa, confirmado con el cliente)
CREATE TABLE tareas (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asignada_a    INT UNSIGNED NOT NULL,        -- usuario responsable
  asignada_por  INT UNSIGNED NOT NULL,        -- quien asigna
  tema          VARCHAR(160) NOT NULL,
  descripcion   TEXT NULL,
  respuesta     TEXT NULL,
  estado        ENUM('pendiente','completada','cancelada') NOT NULL DEFAULT 'pendiente',
  fecha_limite  DATE NULL,
  fecha         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completada_en DATETIME NULL,
  CONSTRAINT fk_tarea_asignada  FOREIGN KEY (asignada_a)   REFERENCES usuarios(id),
  CONSTRAINT fk_tarea_asignador FOREIGN KEY (asignada_por) REFERENCES usuarios(id),
  INDEX idx_tarea_estado (estado)
) ENGINE=InnoDB;

-- Registro de visitas/supervisiones a clientes (modulo ligero; hoy desactivado
-- pero con registros historicos -> se incluye)
CREATE TABLE supervisiones (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT UNSIGNED NOT NULL,        -- quien supervisa
  cliente_id    INT UNSIGNED NULL,
  fecha         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ubicacion     VARCHAR(200) NULL,
  lat           DECIMAL(10,7) NULL,
  lng           DECIMAL(10,7) NULL,
  observaciones VARCHAR(500) NULL,
  CONSTRAINT fk_superv_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_superv_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  INDEX idx_superv_fecha (fecha)
) ENGINE=InnoDB;

-- ==========================================================
-- 9) BITACORA (auditoria de acciones - quien hizo que)
-- ==========================================================
CREATE TABLE bitacora (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NULL,
  accion     VARCHAR(80) NOT NULL,      -- 'venta.confirmar','inventario.ajuste',...
  entidad    VARCHAR(50) NULL,
  entidad_id BIGINT UNSIGNED NULL,
  detalle    JSON NULL,
  fecha      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bitacora_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_bitacora_entidad (entidad, entidad_id)
) ENGINE=InnoDB;

-- ============================================================
-- ALCANCE CONFIRMADO CON EL CLIENTE:
--   * Facturacion CFDI/SAT : NO (solo notas/recibos internos)   -> fuera
--   * Tareas               : SI, sin foto/mapa                  -> incluida (tabla tareas)
--   * QR                   : NO (no existe en el sistema vivo)   -> fuera
--   * Supervision          : con registros historicos           -> incluida (tabla supervisiones)
--   * Marcas / Proveedores : NO aparecen en el catalogo vivo     -> fuera (se agregan si los piden)
-- ============================================================
