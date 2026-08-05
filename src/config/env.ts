import dotenv from "dotenv";

dotenv.config();

export const NODE_ENV = process.env.NODE_ENV || "development";

// Accepted NODE_ENV values (SEC-N3). Anything else is a typo or an
// unsupported convention — fail fast instead of silently treating a public
// environment as development.
const KNOWN_ENVIRONMENTS = ["development", "production", "prod", "test", "staging"] as const;

/**
 * Production check (SEC-N3). Exact-string `NODE_ENV === "production"` was
 * fragile: `undefined`, "prod" or "staging" would NOT count as production and
 * the public dev fallbacks (JWT dev secret, admin123) would stay alive on a
 * real environment.
 *
 * Policy:
 *  - true  for "production", "prod" and "staging". Staging counts as
 *    production-like because public fallbacks are dangerous on ANY
 *    non-local environment (fail-fast on missing secrets, seed route 404).
 *  - false for "development" and "test".
 *  - NODE_ENV unset/empty → treated as development (backwards compatible)
 *    BUT a clear warning is printed: never deploy with NODE_ENV unset.
 *  - any other value → throws. A misspelled NODE_ENV (e.g. "Production",
 *    "PROD ") must fail loudly, not silently downgrade to dev.
 */
export const isProduction = (): boolean => {
  const raw = process.env.NODE_ENV;
  if (!raw || raw.trim() === "") {
    console.warn(
      "⚠️ NODE_ENV not set, defaulting to development — DO NOT use in production"
    );
    return false;
  }

  const normalized = raw.trim().toLowerCase();
  if (!(KNOWN_ENVIRONMENTS as readonly string[]).includes(normalized)) {
    throw new Error(
      `Invalid NODE_ENV "${raw}". Allowed values: ${KNOWN_ENVIRONMENTS.join(", ")}`
    );
  }

  return normalized === "production" || normalized === "prod" || normalized === "staging";
};

/**
 * JWT secret used to sign/verify dashboard auth tokens.
 * Fail-fast (SEC-001): in production the process refuses to boot without an
 * explicit JWT_SECRET — there is NO public fallback. In development a
 * clearly-marked fallback keeps the local flow and E2E tests working.
 */
export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (isProduction()) {
    if (!secret) {
      throw new Error("JWT_SECRET is required in production");
    }
    return secret;
  }
  // Development-only fallback — never use in production.
  return secret || "whatsapp-bot-dev-secret-key-change-in-production";
};

/**
 * Admin seed credentials (SEC-002). In production ADMIN_EMAIL and
 * ADMIN_PASSWORD are mandatory — the public admin123 default is NEVER used.
 * In development, fallbacks keep the local flow and E2E tests working.
 */
export const getAdminCredentials = (): { email: string; password: string } => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (isProduction()) {
    if (!email || !password) {
      throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required in production");
    }
    return { email, password };
  }
  return {
    email: email || "admin@example.com", // development-only fallback
    password: password || "admin123",    // development-only fallback
  };
};

/**
 * Allowed CORS origin for the dashboard (SEC-004). Falls back to the local
 * Vite dev server in development.
 */
export const getDashboardOrigin = (): string =>
  process.env.DASHBOARD_ORIGIN || "http://localhost:5173";

/**
 * Demo mode flag (SEC-DEMO). Controls whether public demo credentials are
 * exposed via GET /api/auth/demo and whether the demo support user is seeded.
 *
 * Policy:
 *  - true  for any non-production environment (development/test) — local
 *    dev and test runs are always demo so the login page shows hints.
 *  - true  in production ONLY when DEMO_MODE === "true" is explicitly set.
 *  - false in production without DEMO_MODE — the demo endpoint must NEVER
 *    leak credentials on a real environment.
 */
export const isDemoMode = (): boolean => {
  if (!isProduction()) return true; // local dev/test always demo
  return process.env.DEMO_MODE === "true"; // production only when explicitly opted-in
};
