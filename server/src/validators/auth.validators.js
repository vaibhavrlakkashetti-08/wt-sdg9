const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGISTRATION_FIELDS = new Set(["name", "email", "password", "confirmPassword"]);
const LOGIN_FIELDS = new Set(["email", "password"]);

function validateObject(payload, allowedFields) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [{ field: "body", message: "Must be a JSON object." }];
  }

  return Object.keys(payload)
    .filter((field) => !allowedFields.has(field))
    .map((field) => ({ field, message: "Unknown field." }));
}

function validateEmail(email) {
  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim()) || email.trim().length > 254) {
    return { field: "email", message: "Enter a valid email address." };
  }
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 12 || password.trim().length === 0) {
    return { field: "password", message: "Password must be at least 12 characters." };
  }
  if (Buffer.byteLength(password, "utf8") > 72) {
    return { field: "password", message: "Password must be no more than 72 UTF-8 bytes." };
  }
}

export function validateRegistrationBody(body) {
  const errors = validateObject(body, REGISTRATION_FIELDS);
  if (typeof body?.name !== "string" || body.name.trim().length < 2 || body.name.trim().length > 80) {
    errors.push({ field: "name", message: "Name must be between 2 and 80 characters." });
  }

  const emailError = validateEmail(body?.email);
  if (emailError) errors.push(emailError);

  const passwordError = validatePassword(body?.password);
  if (passwordError) errors.push(passwordError);

  if (body?.confirmPassword !== undefined && body.confirmPassword !== body.password) {
    errors.push({ field: "confirmPassword", message: "Passwords do not match." });
  }

  return errors;
}

export function validateLoginBody(body) {
  const errors = validateObject(body, LOGIN_FIELDS);
  const emailError = validateEmail(body?.email);
  if (emailError) errors.push(emailError);

  if (typeof body?.password !== "string" || body.password.length === 0 || Buffer.byteLength(body.password, "utf8") > 72) {
    errors.push({ field: "password", message: "Enter a valid password." });
  }

  return errors;
}