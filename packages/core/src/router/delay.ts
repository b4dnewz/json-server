import * as pause from "connect-pause";

/**
 * Adds a delay to the request
 */
export default function(req, res, next) {
  const delay = parseFloat(req.query._delay);
  if (isNaN(delay) || delay === 0) {
    next();
    return;
  }

  // Remove the parameter from the query object
  delete req.query._delay;
  pause(delay)(req, res, next);
}
