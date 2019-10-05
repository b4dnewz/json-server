/**
 * No cache for IE
 * https://support.microsoft.com/en-us/kb/234067
 */
export default function(req, res, next) {
  res.header("Cache-Control", "no-cache");
  res.header("Pragma", "no-cache");
  res.header("Expires", "-1");
  next();
}
