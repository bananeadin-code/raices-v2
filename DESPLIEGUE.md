# Despliegue a producción — Raíces Duranguenses (CloudPanel)

Guía para subir el sistema nuevo al servidor de CloudPanel donde hoy está el
sistema viejo (PHP). Pensada para hacerse **sin prisa el día del corte**, dejando
el viejo accesible hasta validar el nuevo.

> Arquitectura: **backend** Node/Express (puerto interno, p. ej. 4000) + **frontend**
> estático (build de Vite) + **MySQL**. El frontend habla con el backend por `/api`.

---

## 0. Antes de tocar el servidor (en local)

- [ ] `git pull` / código al día y **builds verdes**:
  - Backend: `cd backend && npm run build` → genera `dist/`.
  - Frontend: se construye en el paso 6 (necesita la URL real del API).
- [ ] Decidir los dominios finales. Dos opciones:
  - **A) Un solo dominio** (recomendado): frontend en `https://sistema.raicesduranguenses.com`
    y backend detrás del mismo dominio en `…/api` (proxy inverso).
  - **B) Subdominio para API**: frontend en `sistema.…` y backend en `api.…`.
- [ ] Generar el secreto JWT:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

---

## 1. CloudPanel: crear sitio y base de datos

- [ ] **Sitio Node.js** para el backend (o un sitio con Reverse Proxy al puerto 4000).
- [ ] **Sitio estático** (o carpeta pública) para el frontend (servirá `frontend/dist`).
- [ ] **Base de datos MySQL** (sección *Databases*): crea `raices_prod` + usuario
      `raices_prod` con contraseña fuerte. Anota host/puerto/usuario/clave.
- [ ] Certificados **SSL (Let's Encrypt)** para el/los dominios.

---

## 2. Subir el código

- [ ] Clonar el repo en el servidor (o subir por SFTP) en la carpeta del sitio.
- [ ] Backend:
  ```bash
  cd backend
  npm install           # incluye devDeps: se necesitan para migrar (usa tsx) y build
  cp .env.production.example .env   # y editar con los datos reales (paso 3)
  npm run build         # genera dist/
  ```

---

## 3. Variables de entorno (backend `.env`)

Partir de `backend/.env.production.example`. Clave:

| Variable | Valor en producción |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `4000` (o el que proxyee CloudPanel) |
| `DB_HOST/PORT/USER/PASSWORD/NAME` | los de la BD creada en CloudPanel |
| `JWT_SECRET` | el secreto generado en el paso 0 |
| `CORS_ORIGIN` | el dominio EXACTO del frontend con `https://`, sin barra final |

---

## 4. Base de datos: estructura y datos (ORDEN IMPORTA)

Desde `backend/` con el `.env` apuntando a la BD de producción:

```bash
# 1) Estructura base
mysql -h HOST -u USER -p NOMBRE_BD < db/schema.sql

# 2) Migraciones incrementales (idempotentes, en este orden)
npm run migrate:garantias
npm run migrate:ventas
npm run migrate:jefe
npm run migrate:extras
npm run migrate:ronda2
npm run migrate:mig3          # categorías en árbol, flotilla real, caja por tipo

# 3) Semillas base y de catálogo/clientes
npm run seed                  # rol admin + permisos + usuario admin/admin123
npm run seed:clientes-mig     # 1ª tanda de clientes (datos reales fijos)
```

- **NO** correr `npm run seed:demo` (datos de prueba) ni `npm run migrate:legacy`
  (ETL completo del sistema viejo): la migración es selectiva.
- El Panel del Jefe arranca con credenciales `jefe / jefe123` (cámbialas).
- El usuario inicial es `admin / admin123` → **cambiar la contraseña** al entrar.

---

## 5. Arrancar el backend (PM2)

```bash
cd backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup     # una sola vez; ejecutar lo que imprima
```

Verificar: `curl http://127.0.0.1:4000/api/health` → `{"ok":true}`.
En CloudPanel, apuntar el **Reverse Proxy** del dominio del API a `127.0.0.1:4000`.

---

## 6. Construir y publicar el frontend

```bash
cd frontend
cp .env.production.example .env.production   # editar VITE_API_URL con el dominio real
npm install
npm run build        # genera dist/
```

- Copiar el contenido de `frontend/dist/` a la raíz pública del sitio del frontend.
- Como es una SPA (React Router), configurar el **fallback a `index.html`**
  (en CloudPanel/Nginx: `try_files $uri $uri/ /index.html;`).

---

## 7. DNS / corte (cutover)

- [ ] Probar TODO primero con un subdominio o `/etc/hosts` antes de mover el DNS.
- [ ] Cuando esté validado, apuntar el dominio final al nuevo sitio.
- [ ] Mantener el sistema viejo accesible (otro subdominio) unos días por si acaso.

---

## 8. Respaldo y rollback

- [ ] **Antes del corte**: respaldo del sitio viejo y de su BD
      (`mysqldump` del viejo) — guardarlo fuera del servidor.
- [ ] Respaldo diario de `raices_prod` (CloudPanel permite backups programados).
- [ ] **Rollback**: si algo falla, volver a apuntar el DNS al sitio viejo (sigue intacto).

---

## 9. Checklist post-despliegue

- [ ] Entrar con `admin`, cambiar su contraseña y la del Panel del Jefe.
- [ ] Crear los usuarios reales del negocio y sus permisos.
- [ ] Verificar: login (y que bloquee tras 5 intentos fallidos), POS + impresión
      de nota (Carta), reporte del día, caja + recibo de gasto, clientes migrados.
- [ ] Capturar/ajustar sucursales, artículos, materias e inventario reales.
- [ ] Confirmar que `CORS_ORIGIN` y `VITE_API_URL` apuntan al dominio real (sin CORS en consola).

---

### Pendientes de datos (antes o durante el go-live)
- Resolver el cliente **"Pr…"** de la lista (quedó cortado).
- Validar/limpiar los **CP 34000** de los clientes migrados (posible valor por defecto del sistema viejo).
- Definir el alcance de migración del resto (artículos, inventario, ventas históricas) si lo quieren.
