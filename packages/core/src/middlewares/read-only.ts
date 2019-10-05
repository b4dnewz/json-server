/**
 * Limit requests to GET method only
 */
export default function(req, res, next) {
  if (req.method !== "GET") {
    res.sendStatus(403);
    return;
  }
  next();
}
