import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    // One route, so there is nothing to prefetch across and nothing to scroll
    // back to. Left at the defaults rather than tuned for a navigation that
    // does not happen.
    defaultPreload: false,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
