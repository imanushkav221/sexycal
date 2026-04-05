/**
 * Error tracking via Supabase error_logs table.
 * Replaces Sentry — zero cost, all errors visible in Supabase dashboard.
 */
import { Platform } from "react-native";
import { supabase } from "./supabase";
import Constants from "expo-constants";

let _userId: string | undefined;
let _userEmail: string | undefined;

const APP_VERSION = Constants.expoConfig?.version ?? "unknown";

// Debounce: don't send the same error twice within 10s
const recentErrors = new Map<string, number>();
const DEBOUNCE_MS = 10_000;

export function initSentry() {
  // Set up global error handler for uncaught JS errors
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    captureError(error, {
      tags: { fatal: isFatal ? "true" : "false", source: "global" },
    });
    originalHandler(error, isFatal);
  });

  // Catch unhandled promise rejections
  const originalRejectionTracking = (global as any).__promiseRejectionTrackingOptions;
  if (!originalRejectionTracking) {
    (global as any).__promiseRejectionTrackingOptions = {
      onUnhandled: (id: number, error: unknown) => {
        captureError(error, {
          tags: { source: "unhandled_promise", promiseId: String(id) },
        });
      },
    };
  }
}

/**
 * Capture an error and send it to Supabase error_logs table.
 */
export function captureError(
  error: unknown,
  context?: { tags?: Record<string, string>; extra?: Record<string, unknown> }
) {
  const err = error instanceof Error ? error : new Error(String(error));

  // Always log to console in dev
  if (__DEV__) {
    console.error("[ErrorTracker]", err.message, context);
  }

  // Debounce duplicate errors
  const key = `${err.message}:${context?.tags?.screen ?? ""}:${context?.tags?.module ?? ""}`;
  const now = Date.now();
  if (recentErrors.has(key) && now - recentErrors.get(key)! < DEBOUNCE_MS) {
    return;
  }
  recentErrors.set(key, now);

  // Clean up old entries
  if (recentErrors.size > 50) {
    for (const [k, t] of recentErrors) {
      if (now - t > DEBOUNCE_MS) recentErrors.delete(k);
    }
  }

  // Send to Supabase (fire and forget — don't await, don't crash if it fails)
  supabase
    .from("error_logs")
    .insert({
      user_id: _userId ?? null,
      error_message: err.message,
      error_stack: err.stack?.slice(0, 2000) ?? null,
      screen: context?.tags?.screen ?? context?.tags?.module ?? null,
      module: context?.tags?.module ?? context?.tags?.source ?? null,
      extra: {
        ...context?.extra,
        ...context?.tags,
        platform: Platform.OS,
        email: _userEmail,
      },
      app_version: APP_VERSION,
      device_info: `${Platform.OS} ${Platform.Version}`,
    })
    .then(({ error: insertError }) => {
      if (insertError && __DEV__) {
        console.warn("[ErrorTracker] Failed to log error:", insertError.message);
      }
    })
    .catch(() => {
      // Silently fail — never crash the app due to error tracking
    });
}

/**
 * Log a breadcrumb (no-op for now, kept for API compat)
 */
export function addBreadcrumb(
  _message: string,
  _category: string,
  _data?: Record<string, unknown>
) {
  // Could extend to store breadcrumb trail if needed
}

/**
 * Set user context so errors are tied to a user
 */
export function setSentryUser(userId: string, email?: string) {
  _userId = userId;
  _userEmail = email;
}

export function clearSentryUser() {
  _userId = undefined;
  _userEmail = undefined;
}
