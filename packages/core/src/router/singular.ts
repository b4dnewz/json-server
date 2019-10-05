import {RequestHandler, Router} from "express";
import {LowdbSync} from "lowdb";

import {embed, expand, fields} from "../utils";
import delay from "./delay";
import getFullURL from "./get-full-url";
import {RouterOptions} from "./index";
import write from "./write";

/**
 * Create a router that handle the singular values
 * using a given lowdb instance and the resource name
 */
export default function(db: LowdbSync<any>, name: string, opts: RouterOptions): Router {
  const router = Router();
  router.use(delay);

  /**
   * Handler for GET requests
   */
  const show: RequestHandler = (req, res , next) => {
    let chain = db.get(name);

    const _field = req.query._field;
    const _expand = req.query._expand;
    const _embed = req.query._embed;

    chain = expand(chain, db, opts, _expand);
    chain = embed(chain, name, db, opts, _embed);
    chain = fields(chain, _field);

    res.locals.data = chain.value();
    next();
  };

  /**
   * Handler for POST requests
   */
  const create: RequestHandler = (req, res, next) => {
    if (opts.isFake) {
      res.locals.data = req.body;
    } else {
      db.set(name, req.body).value();
      res.locals.data = db.get(name).value();
    }

    res.setHeader("Access-Control-Expose-Headers", "Location");
    res.location(`${getFullURL(req)}`);

    res.status(201);
    next();
  };

  /**
   * Handler for PUT/PATCH requests
   */
  const update: RequestHandler = (req, res, next) => {
    if (opts.isFake) {
      if (req.method === "PUT") {
        res.locals.data = req.body;
      } else {
        const resource = db.get(name).value();
        res.locals.data = { ...resource, ...req.body };
      }
    } else {
      if (req.method === "PUT") {
        db.set(name, req.body).value();
      } else {
        db.get(name)
          .assign(req.body)
          .value();
      }

      res.locals.data = db.get(name).value();
    }

    next();
  };

  const w = write(db);

  router
    .route("/")
    .get(show)
    .post(create, w)
    .put(update, w)
    .patch(update, w);

  return router;
}
