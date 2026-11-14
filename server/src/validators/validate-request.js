import { AppError } from "../utils/app-error.js";

export function validateRequest(validators) {
  return (request, _response, next) => {
    const details = [];

    for (const [location, validator] of Object.entries(validators)) {
      const errors = validator(request[location]);
      if (Array.isArray(errors)) {
        details.push(...errors.map((error) => ({ location, ...error })));
      }
    }

    if (details.length) {
      return next(new AppError(400, "VALIDATION_ERROR", "Request validation failed.", details));
    }

    return next();
  };
}