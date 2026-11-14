import { LoaderCircle } from "lucide-react";

const variants = {
  primary: "border-transparent bg-accent text-on-accent hover:bg-accent-hover disabled:bg-accent/50",
  secondary: "border-line bg-surface text-ink hover:bg-surface-subtle disabled:opacity-60",
  quiet: "border-transparent bg-transparent text-copy hover:bg-surface-subtle hover:text-ink disabled:opacity-60",
  danger: "border-transparent bg-danger text-on-danger hover:brightness-90 disabled:opacity-60",
};

const sizes = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-10 px-4 text-sm",
  lg: "min-h-11 px-5 text-sm",
};

export default function Button({
  as: Component = "button",
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  startIcon,
  endIcon,
  className = "",
  children,
  type = "button",
  ...props
}) {
  return (
    <Component
      {...(Component === "button" ? { type, disabled: disabled || loading } : { "aria-disabled": disabled || loading || undefined, tabIndex: disabled || loading ? -1 : undefined })}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-md border font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : startIcon}
      {children}
      {!loading && endIcon}
    </Component>
  );
}