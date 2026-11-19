import "dotenv/config";
import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn, // no DSN (e.g. on your laptop) → Sentry stays off
  environment: process.env.NODE_ENV ?? "development",
  release: process.env.APP_VERSION, // optional, e.g. "1.0.0"
  tracesSampleRate: 0, // errors only, no performance tracing
});

if (dsn) console.log("🛰️  Crash reporting on (Sentry)");