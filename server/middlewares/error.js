export function notFound(req, res, next) {
  res.status(404);
  res.json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  console.error('[error]', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ success: false, message: err.message || 'Server error' });
}
