import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import PasswordField from "../components/PasswordField.jsx";
import TextField from "../components/TextField.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useToast } from "../hooks/useToast.js";
import { getApiErrorMessage } from "../services/platformApi.js";
import { getServerFieldErrors, validateRegistrationInput } from "../utils/authValidation.js";

export default function RegisterPage() {
  const { user, register } = useAuth();
  const { notify } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={location.state?.from?.pathname ?? "/"} replace />;

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = validateRegistrationInput(form);
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      notify("Account created.", { tone: "success" });
      navigate(location.state?.from?.pathname ?? "/", { replace: true });
    } catch (error) {
      setFieldErrors(getServerFieldErrors(error));
      setFormError(getApiErrorMessage(error, "Registration failed. Check your connection and try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="w-full max-w-[440px]">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase text-muted">Campus account</p>
        <h1 className="mt-2 text-[26px] font-semibold leading-9 text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-copy">Register as a student with your campus email.</p>
      </div>
      <form onSubmit={handleSubmit} noValidate className="grid gap-4 border border-line bg-surface p-5 sm:p-7">
        {formError && <p role="alert" className="border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">{formError}</p>}
        <TextField
          label="Name"
          type="text"
          autoComplete="name"
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
          minLength={2}
          maxLength={80}
          required
          error={fieldErrors.name}
        />
        <TextField
          label="Campus email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(event) => updateField("email", event.target.value)}
          required
          error={fieldErrors.email}
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          value={form.password}
          onChange={(event) => updateField("password", event.target.value)}
          error={fieldErrors.password}
        />
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(event) => updateField("confirmPassword", event.target.value)}
          error={fieldErrors.confirmPassword}
        />
        <Button type="submit" loading={submitting} className="mt-1 w-full">Create account</Button>
      </form>
      <p className="mt-5 text-center text-sm text-copy">
        Already registered? <Link to="/login" className="font-semibold text-accent no-underline hover:underline">Sign in</Link>
      </p>
    </section>
  );
}