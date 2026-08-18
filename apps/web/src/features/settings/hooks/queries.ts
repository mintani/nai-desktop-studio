"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchSettings, fetchSubscription, saveSettings } from "../api";
import type { SettingsPatch } from "../types";

export const settingsQueryKey = ["settings"] as const;
export const subscriptionQueryKey = ["novelai", "subscription"] as const;

export function useSettings() {
  return useQuery({
    queryKey: settingsQueryKey,
    queryFn: () => fetchSettings(),
    staleTime: Infinity,
  });
}

/** Anlas balance. Not fetched while the key is unset. */
export function useSubscription(enabled: boolean) {
  return useQuery({
    queryKey: subscriptionQueryKey,
    queryFn: () => fetchSubscription(),
    enabled,
    staleTime: 60_000,
  });
}

export function useSaveSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: SettingsPatch) => saveSettings(patch),
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsQueryKey, settings);
      queryClient.invalidateQueries({ queryKey: subscriptionQueryKey });
    },
  });
}
