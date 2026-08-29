# Sistema de diseño — Raíces Duranguenses

Guía breve del sistema visual. Basado en la skill `ui-ux-pro-max`
(tokens, íconos SVG, escala tipográfica) adaptado a CSS variables.

## Reglas
- **Cero emojis en la UI.** Íconos únicamente con `<Icon name="..." />` (SVG, `src/components/Icon.tsx`).
- **Tokens, no valores mágicos.** Todos los colores/radios/sombras salen de las variables CSS en `src/styles.css` (`:root`).
- **Una sola acción primaria por vista** (botón `.primario` / verde de marca).
- **Accesibilidad:** foco visible (ring), `aria-label` en botones de solo ícono, labels asociados.

## Tokens (en `:root` de `styles.css`)
- **Marca (emerald-teal):** `--brand-50…900`. Acento base `--brand-600` (botones), hover `--brand-700`.
- **Neutrales (slate):** `--ink-900` (títulos), `--ink-700` (cuerpo), `--ink-500` (secundario), `--line` (bordes).
- **Superficies:** `--surface` (blanco), `--canvas` (fondo), `--canvas-2`.
- **Semántico:** `--danger` (eliminar/errores).
- **Radios:** `--r-sm/-md/-lg/-full`. **Sombras:** `--sh-sm/-/-lg`.

## Tipografía
- Familia: **fuente nativa del sistema operativo** (`system-ui` / Segoe UI en Windows, San Francisco en macOS). Sin fuente web, para un look de aplicación de escritorio.
- Escala: `h1` 1.5rem/700, `h2` 1.125rem/700, cuerpo 14px, caption 11px mayúsculas para encabezados de tabla.
- Números en tablas: `font-variant-numeric: tabular-nums`.

## Primitivos
- **Botón:** `button` base; `.primario` (acción principal), `.btn-ghost` (secundaria), `.btn-danger` (destructiva), `.btn-sm` (compacto).
- **Input/Select/Textarea:** estilo unificado con foco de marca.
- **Icon:** `src/components/Icon.tsx` — set estilo Lucide, `currentColor`, stroke 1.75.
- **DataTable / Modal:** reutilizables, ya consumen los tokens.
- **Badge:** `.badge` + `.badge-ok` / `.badge-muted` (para estados).

## Cómo agregar un ícono
Edita `ICONS` en `src/components/Icon.tsx` con un path SVG de 24×24 (estilo Lucide) y úsalo con `<Icon name="tuIcono" />`.
