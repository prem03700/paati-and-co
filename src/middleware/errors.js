function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}
function errorHandler(err, req, res, next) {
  if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
  if (err.code === 11000) return res.status(409).json({ message: "A record with that value already exists", fields: err.keyValue });
  if (err.name === "CastError") return res.status(400).json({ message: "Invalid identifier" });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: status >= 500 ? "Internal server error" : err.message });
}
module.exports = { notFound, errorHandler };
