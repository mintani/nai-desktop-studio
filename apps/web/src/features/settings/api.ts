import { apiRequest } from "@/lib/api-client";

import type {
  AppSettings,
  SettingsPatch,
  Subscription,
  VerifyResult,
} from "./types";

export function fetchSettings() {
  return apiRequest<AppSettings>("/settings");
}

export function saveSettings(patch: SettingsPatch) {
  return apiRequest<AppSettings>("/settings", { method: "PUT", body: patch });
}

export function deleteApiKey() {
  return apiRequest<AppSettings>("/settings/api-key", { method: "DELETE" });
}

/**
 * Checks that the key works before saving. Omit apiKey to verify the saved key.
 */
export function verifyApiKey(apiKey?: string) {
  return apiRequest<VerifyResult>("/settings/verify", {
    method: "POST",
    body: { apiKey },
  });
}

export function fetchSubscription() {
  return apiRequest<Subscription>("/novelai/subscription");
}
