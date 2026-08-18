import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "./api-client";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // A missing API key isn't an error but a wait for first-time setup, so
      // don't show a toast.
      if (error instanceof ApiError && error.isApiKeyRequired) return;
      toast.error(error.message);
    },
  }),
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
    },
  },
});
