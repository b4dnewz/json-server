import {createRewriter, createRouter, createServer} from "@json-server/core";
import {StartOptions} from "./start";

interface CreateOptions extends Omit<StartOptions, "auth" | "middlewares" | "routes"> {
  middlewares?: any;
  routes?: any;
}

export default async function(db: any, opts: CreateOptions) {

  // Create the application instance
  const app: any = createServer();
  const router = createRouter(db, {
    foreignKeySuffix: opts.foreignKeySuffix,
    isFake: opts.fake,
  });

  // Add rewrite rule routes
  if (opts.routes) {
    app.use(createRewriter(opts.routes));
  }

  // Add custom middlewares
  if (opts.middlewares) {
    app.use(opts.middlewares);
  }

  // Add generated router
  app.use(router);
  app.db = router.db;

  // Set app configurations
  app.config = opts;

  return app;

}
