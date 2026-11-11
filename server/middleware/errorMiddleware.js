// Runs when no route matched the request. It creates a 404 error and
// hands it to errorHandler below via next(error).
export const notFound = (req, res, next) => {
  const error = new Error(`Not found: ${req.method} ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Central error handler. Express recognises it as an error handler because
// it has exactly four parameters (err, req, res, next).
// Every error in the app ends up here and is returned in the same JSON shape.
export const errorHandler = (err, req, res, next) => {
  // If a controller threw without setting a status, res.statusCode is still 200,
  // which would be wrong for an error, so we use 500 (server error) instead.
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    message: err.message,
    // The stack trace helps while developing but must never be sent in production.
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};
