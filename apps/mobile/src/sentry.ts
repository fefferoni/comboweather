import * as Sentry from "@sentry/react-native";

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_STAGE ?? "dev",
    tracesSampleRate: 0.1,
  });
  initialized = true;
}

export function captureException(err: unknown): void {
  if (!initialized) return;
  Sentry.captureException(err);
}
