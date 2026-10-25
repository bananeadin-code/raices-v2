import { ApiError } from '../../utils/http';

/**
 * Bloqueo de login por usuario (anti fuerza bruta dirigida a una cuenta).
 * Complementa al límite por IP (middleware rateLimit). En memoria: suficiente para
 * un solo proceso/servidor (pm2 fork). Tras MAX_FAILS intentos fallidos la cuenta
 * queda bloqueada LOCK_MS. Un login exitoso limpia el contador.
 * Se cuenta por nombre de usuario ENVIADO (exista o no) para no revelar cuáles existen.
 */
const MAX_FAILS = 5;
const LOCK_MS = 10 * 60 * 1000; // 10 minutos

const intentos = new Map<string, { fails: number; lockUntil: number }>();

const key = (usuario: string) => (usuario || '').trim().toLowerCase();

// Lanza 429 si la cuenta está bloqueada ahora mismo. Llamar ANTES de validar credenciales.
export function assertNotLocked(usuario: string) {
  const k = key(usuario);
  const rec = intentos.get(k);
  if (!rec) return;
  if (rec.lockUntil && Date.now() > rec.lockUntil) { intentos.delete(k); return; } // expiró
  if (rec.lockUntil && Date.now() <= rec.lockUntil) {
    const mins = Math.max(1, Math.ceil((rec.lockUntil - Date.now()) / 60000));
    throw new ApiError(429, `Cuenta bloqueada temporalmente por varios intentos fallidos. Intenta de nuevo en ${mins} min.`);
  }
}

// Registra un intento fallido; bloquea al llegar a MAX_FAILS.
export function recordFailure(usuario: string) {
  const k = key(usuario);
  const now = Date.now();
  let rec = intentos.get(k);
  if (!rec || (rec.lockUntil && now > rec.lockUntil)) rec = { fails: 0, lockUntil: 0 };
  rec.fails++;
  if (rec.fails >= MAX_FAILS) rec.lockUntil = now + LOCK_MS;
  intentos.set(k, rec);
  // Limpieza ocasional para no crecer sin límite.
  if (intentos.size > 5000) for (const [kk, v] of intentos) if (!v.lockUntil || now > v.lockUntil) intentos.delete(kk);
}

// Login exitoso: limpia el contador de esa cuenta.
export function recordSuccess(usuario: string) {
  intentos.delete(key(usuario));
}
