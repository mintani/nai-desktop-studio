import { createFileRoute } from "@tanstack/react-router";

import { GenerateWorkspace } from "@/features/generate/components/generate-workspace";
import { SetupGate } from "@/features/settings/components/setup-gate";

export const Route = createFileRoute("/")({
  component: Home,
});

/**
 * The whole app. One route on purpose: generating is a long wait spent watching
 * the history and the parameters, so nothing is worth putting on another
 * screen.
 */
function Home() {
  return (
    <SetupGate>
      <GenerateWorkspace />
    </SetupGate>
  );
}
