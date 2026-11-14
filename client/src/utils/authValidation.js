const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginInput({ email, password }) {
  const errors = {};
  if (!emailPattern.test(email.trim()) || email.trim().length > 254) errors.email = "Enter a valid email address.";
  if (!password) errors.password = "Enter your password.";
  else if (new TextEncoder().encode(password).length > 72) errors.password = "Password exceeds the supported length.";
  return errors;
}

export function validateRegistrationInput({ name, email, password, confirmPassword }) {
  const errors = {};
  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 80) errors.name = "Name must be between 2 and 80 characters.";
  if (!emailPattern.test(email.trim()) || email.trim().length > 254) errors.email = "Enter a valid email address.";
  const passwordBytes = new TextEncoder().encode(password).length;
  if (password.length < 12) errors.password = "Use at least 12 characters.";
  else if (passwordBytes > 72) errors.password = "Password must be no more than 72 UTF-8 bytes.";
  if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";
  return errors;
}

export function getServerFieldErrors(error) {
  const details = error?.response?.data?.error?.details ?? [];
  return Object.fromEntries(details.filter((detail) => detail.location === "body").map((detail) => [detail.field, detail.message]));
}