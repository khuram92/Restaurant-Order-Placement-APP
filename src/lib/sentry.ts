import * as Sentry from "@sentry/react-native";


const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn && !__DEV__,
  environment: __DEV__ ? "development" : "production",
  tracesSampleRate: 0, // errors only
  beforeSend(event) {
    if (event.user) delete event.user.ip_address;
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.Authorization;
    }
    return event;
  },
});

/** Called when someone logs in / out */
export const setSentryUser = (user: { _id: string; role: string } | null) => {
  Sentry.setUser(user ? { id: user._id } : null);
  Sentry.setTag("role", user?.role ?? "guest");
};

export { Sentry };