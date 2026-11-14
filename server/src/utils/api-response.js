export function sendSuccess(response, data, { statusCode = 200, meta } = {}) {
  return response.status(statusCode).json({ data, ...(meta ? { meta } : {}) });
}