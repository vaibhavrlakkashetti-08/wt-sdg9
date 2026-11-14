import Button from "./Button.jsx";

export default function IconButton({ icon: Icon, label, className = "", ...props }) {
  return (
    <Button
      variant="quiet"
      size="sm"
      aria-label={label}
      title={label}
      className={`h-10 w-10 !min-h-10 !p-0 ${className}`}
      {...props}
    >
      <Icon aria-hidden="true" className="h-5 w-5" />
    </Button>
  );
}