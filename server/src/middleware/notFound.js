export function notFoundHandler(request, _response, next) {
  const error = new Error(`Route not found: ${request.method} ${request.path}`);
  error.statusCode = 404;
  error.code = "NOT_FOUND";
  next(error);
}