function createResponse(success, data = null, error = null) {
  return { success, data, error };
}

export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json(createResponse(false, null, 'Invalid JSON payload'));
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json(createResponse(false, null, err.message));
  }

  const status = err.status || err.statusCode || 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  res.status(status).json(createResponse(false, null, message));
}

export function notFoundHandler(req, res) {
  res.status(404).json(createResponse(false, null, 'Route not found'));
}