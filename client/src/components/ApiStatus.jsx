import { useEffect, useState } from "react";
import { CircleCheck, Database, LoaderCircle, Server } from "lucide-react";
import ErrorState from "./ErrorState.jsx";
import { getApiHealth } from "../services/apiClient.js";

export default function ApiStatus() {
  const [state, setState] = useState({ status: "loading", health: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    getApiHealth({ signal: controller.signal })
      .then((health) => setState({ status: "connected", health }))
      .catch((error) => {
        if (!controller.signal.aborted) {
          setState({ status: "error", health: null, error });
        }
      });

    return () => controller.abort();
  }, [attempt]);

  if (state.status === "error") {
    return <ErrorState title="API unavailable" message="The server status request failed." onRetry={() => setAttempt((value) => value + 1)} />;
  }

  return (
    <section aria-live="polite" className="border border-line bg-surface p-5">
      <div className="flex items-center gap-3">
        {state.status === "loading" ? <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin text-accent" /> : <CircleCheck aria-hidden="true" className="h-5 w-5 text-success" />}
        <div>
          <h2 className="text-sm font-semibold text-ink">{state.status === "connected" ? "API connected" : "Connecting to API"}</h2>
          <p className="mt-0.5 text-xs text-muted">{state.status === "connected" ? state.health.service : "Requesting live server status"}</p>
        </div>
      </div>
      {state.status === "connected" && (
        <div className="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm text-copy">
            <Server aria-hidden="true" className="h-4 w-4 text-muted" />
            <span>API</span>
            <span className="ml-auto font-medium text-success">Online</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-copy">
            <Database aria-hidden="true" className="h-4 w-4 text-muted" />
            <span>Database</span>
            <span className={`ml-auto font-medium ${state.health.database.connected ? "text-success" : "text-warning"}`}>
              {state.health.database.connected ? "Connected" : state.health.database.configured ? "Unavailable" : "Not configured"}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}