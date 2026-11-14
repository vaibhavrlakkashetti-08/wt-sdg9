import { ArrowLeft, Blocks } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../components/Button.jsx";
import EmptyState from "../components/EmptyState.jsx";

export default function PlaceholderPage({ title }) {
  return (
    <EmptyState
      icon={Blocks}
      title={`${title} is not available yet`}
      description="This section will be added in a later development phase."
      action={<Button as={Link} to="/" variant="secondary" startIcon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />}>Back to overview</Button>}
    />
  );
}