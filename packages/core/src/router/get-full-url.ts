import {Request} from "express";
import {format} from "url";

/**
 * Return the full url string from the request
 */
export default function getFullURL(req: Request) {
  const root = format({
    protocol: req.protocol,
    host: req.get("host"),
  });

  return `${root}${req.originalUrl}`;
}
