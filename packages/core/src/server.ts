import { CompressionOptions } from "compression";
import { CorsOptions } from "cors";
import * as express from "express";
import { LowdbSync } from "lowdb";

import createMiddlewares from "./defaults";
import createRouter, { RouterOptions } from "./router";
import { initDatabase } from "./utils";

const defaultOptions: ServerOptions = {
  readOnly: false,
  pretty: true,
  logger: true,
  cors: true,
  gzip: true,
};

export interface JsonServer extends express.Application {
  config: ServerOptions;
  db: LowdbSync<any>;
}

export interface ServerOptions extends RouterOptions {
  pretty?: boolean | number;
  cors?: boolean | CorsOptions;
  gzip?: boolean | CompressionOptions;
  logger?: boolean | string;
  readOnly?: boolean;
  static?: string;
  bodyParser?: boolean;
  rewriter?: express.Router;
  middlewares?: express.RequestHandler[];
}

/**
 * Function that creates a JSON server from a given database
 * with options to customize the behaviour
 * it returns and express application
 */
export default function(db?: any, opts: ServerOptions = defaultOptions): JsonServer {

  opts = {
    ...defaultOptions,
    ...opts,
  };

  const app = express() as any;
  const defaults = createMiddlewares(opts);

  app.use(defaults);

  // Enable pretty JSON printing
  if (opts.pretty) {
    app.set("json spaces", typeof opts.pretty === "number" ? opts.pretty : 2);
  }

  // Add routes rewriter
  if (opts.rewriter) {
    app.use(opts.rewriter);
  }

  if (opts.middlewares) {
    app.use(opts.middlewares);
  }

  // Initialize the router using the given database
  if (db) {
    const router = createRouter(db, opts);
    app.db = router.db;
    app.use(router);
  } else {
    app.db = initDatabase(db || {});
  }

  // Expose the application configuration
  app.config = opts;

  return app;

}
