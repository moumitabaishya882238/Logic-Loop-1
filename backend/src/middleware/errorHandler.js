function notFoundHandler(req, res) {
  res.status(404).json({ detail: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const detail = err.message || "Internal server error";

  if (statusCode >= 500) {
    console.error("Unhandled error:", err);
  }

  res.status(statusCode).json({ detail });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
