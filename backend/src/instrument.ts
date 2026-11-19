import "dotenv/config";
import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  environment: process.env.NODE_ENV ?? "development",
  release: process.env.APP_VERSION, // optional, e.g. "1.0.0"
  tracesSampleRate: 0, 

 
  beforeSend(event) {
    if (event.user) delete event.user.ip_address;
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      if (event.request.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.Authorization;
        delete event.request.headers.cookie;
      }
    }
    return event;
  },
});

if (dsn) console.log("🛰️  Crash reporting on (Sentry)");