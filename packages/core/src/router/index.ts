import { Router } from "express";
import * as _ from "lodash";
import * as lodashId from "lodash-id";
import * as methodOverride from "method-override";

import { bodyParser } from "../middlewares";
import * as mixins from "../mixins";
import { initDatabase } from "../utils";
import nested from "./nested";
import plural from "./plural";
import singular from "./singular";

export interface RouterOptions {
  foreignKeySuffix?: string;
  isFake?: boolean;
}

/**
 * Create an express router based on a given database object
 * that can be a local file or a json object variable
 */
export default function(input: string | any, opts: RouterOptions = {}) {

  opts = {
    foreignKeySuffix: "Id",
    isFake: false,
    ...opts,
  };

  const db = initDatabase(input);
  const router: any = Router();

  // Add middlewares
  router.use(methodOverride());
  router.use(bodyParser);

  // Add lodash-id methods to db
  db._.mixin(lodashId);

  // Add specific mixins
  db._.mixin(mixins);

  // Expose render
  router.render = (req, res) => {
    res.jsonp(res.locals.data);
  };

  // GET /db returns the database current state
  router.get("/db", (req, res) => {
    res.jsonp(db.getState());
  });

  // Handle /:parent/:parentId/:resource
  router.use(nested(opts));

  // Create routes based on database structure
  db.forEach((value, key) => {
    if (_.isPlainObject(value)) {
      router.use(`/${key}`, singular(db, key, opts));
      return;
    }

    if (_.isArray(value)) {
      router.use(`/${key}`, plural(db, key, opts));
      return;
    }

    throw new Error(`Type of "${key}" (${typeof value}) is not supported.`);
  }).value();

  // Handle not found errors
  router.use((req, res) => {
    if (!res.locals.data) {
      res.status(404);
      res.locals.data = {};
    }

    router.render(req, res);
  });

  // Handle generic errors
  router.use((err, req, res, next) => {
    // tslint:disable-next-line
    console.error(err.stack);
    res.status(500).send(err.stack);
  });

  // Expose database
  router.db = db;

  return router;

}
