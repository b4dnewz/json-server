import * as compression from "compression";
import * as cors from "cors";
import * as errorhandler from "errorhandler";
import * as express from "express";
import * as fs from "fs";
import * as _ from "lodash";
import * as logger from "morgan";
import * as path from "path";

import {bodyParser, noCache, readOnly} from "./middlewares";
import {ServerOptions} from "./server";

/**
 * Return an array of middlewares based on application options
 * that will be applied to the server after its creation
 */
export default function(opts: ServerOptions = {}) {
  const userDir = path.join(process.cwd(), "public");
  const defaultDir = path.join(__dirname, "../public");
  const staticDir = fs.existsSync(userDir) ? userDir : defaultDir;

  const arr = [];

  // Default options values
  opts = {
    static: staticDir,
    ...opts,
  };

  // only use in development
  if (process.env.NODE_ENV === "development") {
    arr.push(errorhandler());
  }

  // Serve static files
  arr.push(express.static(opts.static));

  // Compress all requests
  if (opts.gzip) {
    const compressionOptions = _.isBoolean(opts.gzip) ? {} : opts.gzip;
    arr.push(compression(compressionOptions));
  }

  // Enable CORS for all the requests, including static files
  if (opts.cors) {
    const corsOptions = _.isBoolean(opts.cors) ? {
      origin: true,
      credentials: true,
    } : opts.cors;
    arr.push(cors(corsOptions));
  }

  // Logger
  if (opts.logger) {
    const format = typeof opts.logger === "string" ? opts.logger : "dev";
    arr.push(
      logger(format, {
        skip: (req) =>
          process.env.NODE_ENV === "test" || req.path === "/favicon.ico",
      }),
    );
  }

  // No cache for IE
  // https://support.microsoft.com/en-us/kb/234067
  arr.push(noCache);

  // Limit queries to GET only
  if (opts.readOnly) {
    arr.push(readOnly);
  }

  // Add middlewares
  if (opts.bodyParser) {
    arr.push(bodyParser);
  }

  // Return the middlewares array
  return arr;
}
