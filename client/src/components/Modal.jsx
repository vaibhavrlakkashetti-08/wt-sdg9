import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import IconButton from "./IconButton.jsx";

export default function Modal({ open, onClose, title, description, children, actions, className = "" }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={`m-auto w-[min(100%-32px,480px)] rounded-lg border border-line bg-surface p-0 text-ink shadow-2xl ${className}`}
    >
      <div className="flex items-start gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-base font-semibold">{title}</h2>
          {description && <p id={descriptionId} className="mt-1 text-sm leading-5 text-copy">{description}</p>}
        </div>
        <IconButton icon={X} label="Close dialog" onClick={onClose} />
      </div>
      <div className="px-5 py-5">{children}</div>
      {actions && <div className="flex justify-end gap-2 border-t border-line bg-surface-subtle px-5 py-4">{actions}</div>}
    </dialog>
  );
}