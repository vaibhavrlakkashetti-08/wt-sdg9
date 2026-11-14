import { Link } from "react-router-dom";
import Button from "../components/Button.jsx";
import EmptyState from "../components/EmptyState.jsx";

export default function NotFoundPage() {
  return (
    <EmptyState
      title="Page not found"
      description="The address may be incorrect or the page may have moved."
      action={<Button as={Link} to="/">Return to overview</Button>}
    />
  );
}