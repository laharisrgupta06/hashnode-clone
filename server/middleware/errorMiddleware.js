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
  // Pick the status code, in this order:
  // 1. one a controller set with res.status(...)
  // 2. one attached to the error itself (e.g. 400 from Express when the JSON body is malformed)
  // 3. otherwise 500 (server error), because res.statusCode is still 200 which is wrong for an error.
  let statusCode = 500;
  if (res.statusCode !== 200) {
    statusCode = res.statusCode;
  } else if (err.status >= 400 && err.status < 500) {
    statusCode = err.status;
  }

  res.status(statusCode).json({
    message: err.message,
    // The stack trace helps while developing but must never be sent in production.
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};
