import { createContext, useCallback, useState } from "react";
import { CircleCheck, Info, OctagonAlert, X } from "lucide-react";

export const ToastContext = createContext(null);

const tones = {
  success: { icon: CircleCheck, color: "text-success" },
  info: { icon: Info, color: "text-accent" },
  error: { icon: OctagonAlert, color: "text-danger" },
};

function ToastItem({ toast, dismiss }) {
  const { icon: Icon, color } = tones[toast.tone] ?? tones.info;

  return (
    <div role={toast.tone === "error" ? "alert" : "status"} className="flex items-start gap-3 border border-line bg-surface px-4 py-3 shadow-lg">
      <Icon aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
      <p className="min-w-0 flex-1 text-sm leading-5 text-ink">{toast.message}</p>
      <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)} className="grid h-6 w-6 shrink-0 place-items-center rounded text-muted hover:bg-surface-subtle hover:text-ink">
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);
  const notify = useCallback((message, { tone = "info", duration = 4000 } = {}) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div aria-label="Notifications" className="fixed bottom-4 right-4 z-50 grid w-[min(100%-32px,360px)] gap-2">
        {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} dismiss={dismiss} />)}
      </div>
    </ToastContext.Provider>
  );
}