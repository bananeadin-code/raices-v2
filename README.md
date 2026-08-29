# Raíces Duranguenses — Sistema v2

Reescritura del sistema administrativo/POS de Raíces Duranguenses.
Monorepo: **backend** (Node + TypeScript + Express + MySQL) y **frontend** (React + TypeScript + Vite).

## Requisitos
- Node 20+
- Docker (para MySQL local) — o un MySQL 8 instalado

## Puesta en marcha (local)

1. **Base de datos** (Docker levanta MySQL 8 + Adminer y carga el esquema):
   ```bash
   docker compose up -d
   ```
   - MySQL en `localhost:3306` (db: `raices_v2`, user: `raices`, pass: `raices`)
   - Adminer (explorador web de la BD) en `http://localhost:8080`

2. **Backend**:
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm run dev
   ```
   API en `http://localhost:4000`.

3. **Frontend**:
   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm run dev
   ```
   App en `http://localhost:5173`.

## Estructura

```
backend/
  db/schema.sql          # esquema de la base (fuente de verdad)
  src/
    config/env.ts        # configuración por variables de entorno
    db/pool.ts           # pool MySQL + helper de transacciones
    middleware/          # auth (JWT) y manejo de errores
    utils/http.ts        # ApiError + asyncHandler
    modules/
      auth/              # login
      clientes/          # MÓDULO DE EJEMPLO (copiar este patrón)
    routes.ts            # monta todas las rutas
    index.ts             # arranque del servidor
frontend/
  src/
    api/client.ts        # fetch con token
    auth/AuthContext.tsx # sesión + permisos
    components/          # DataTable y Modal reutilizables
    layout/Layout.tsx    # menú por rol (operativo / admin)
    pages/               # Login + páginas por módulo
```

## Cómo agregar un módulo nuevo (patrón)
El módulo `clientes` es la plantilla. Para uno nuevo (ej. `articulos`):

**Backend** — copia `src/modules/clientes/` a `src/modules/articulos/` y ajusta:
- `*.schema.ts`  → validaciones Zod de ese recurso
- `*.service.ts` → consultas SQL **parametrizadas** (nada de concatenar)
- `*.controller.ts` / `*.routes.ts` → endpoints REST
- regístralo en `src/routes.ts`

**Frontend** — copia `src/pages/Clientes.tsx` a `Articulos.tsx`, ajusta columnas y campos, y añade la ruta en `App.tsx` y el enlace en `Layout.tsx`.

## Migración de datos (ETL viejo → nuevo)
El script `backend/src/db/migrate-legacy.ts` lee la base del sistema viejo
(`uraiz24_sistema`) y la carga en el esquema nuevo, preservando los IDs.

Pasos para ensayar el cutover en local:
1. Importa el dump viejo en MySQL como base `uraiz24_sistema`.
2. Ten el esquema nuevo creado (`docker compose up -d` ya lo hace en `raices_v2`).
3. Configura `OLD_DB_*` en `backend/.env`.
4. Ejecuta:
   ```bash
   cd backend && npm run migrate:legacy
   ```

Qué hace (resumen):
- Catálogos (sucursales, roles, usuarios, categorías, clientes, artículos, materias, vehículos, receta/BOM).
- Inventario: reconstruye existencias por almacén desde los movimientos
  (producto = `SUM(cantidad)`, materia = `SUM(cantidad*es)`).
- Ventas: recibos → `ventas`, y sus renglones (movimientos de venta) → `venta_items`;
  continúa la numeración de folios por sucursal.
- Crédito (`abonos`), producción, tareas y supervisiones.

Decisiones marcadas en el script (revisar con el negocio):
- Contraseñas viejas = PIN en texto plano → se pone **temporal** (`cambiar123`) y se fuerza cambio.
- Materia prima no tiene sucursal en el viejo → se asigna a `MATERIA_SUCURSAL_ID`.
- `metodo_pago`: código 6 = crédito; el resto se asume efectivo (confirmar códigos).
- La sucursal 14 "PENDIENTES" (parche viejo) se migra pero su stock se revisa a mano.

## Regularizaciones ya consideradas en la arquitectura
- Consultas **parametrizadas** (fin de la inyección SQL).
- Validación de entrada con **Zod**.
- **Transacciones** para operaciones de inventario/venta/producción (helper `withTransaction`).
- **JWT + bcrypt** y permisos por módulo.
- Inventario **multi-almacén** y ventas con **estado** (pendiente reserva stock) — ver `db/schema.sql`.
