import {RequestHandler, Router} from "express";
import * as _ from "lodash";
import * as pluralize from "pluralize";

import delay from "./delay";
import {RouterOptions} from "./index";

export default function(opts: RouterOptions) {
  const router = Router();
  router.use(delay);

  /**
   * Rewrite URL (/:resource/:id/:nested -> /:nested) and request query
   */
  const get: RequestHandler = (req, {}, next) => {
    const prop = pluralize.singular(req.params.resource);
    req.query[`${prop}${opts.foreignKeySuffix}`] = req.params.id;
    req.url = `/${req.params.nested}`;
    next();
  };

  /**
   * Rewrite URL (/:resource/:id/:nested -> /:nested) and request body
   */
  const post: RequestHandler = (req, {}, next) => {
    const id = /^\d+$/.test(req.params.id) ? +req.params.id : req.params.id;
    const prop = pluralize.singular(req.params.resource) + opts.foreignKeySuffix;
    if (_.isArray(req.body)) {
      req.body = req.body.map((r) => ({
        ...r,
        [prop]: id,
      }));
    } else {
      req.body[prop] = id;
    }
    req.url = `/${req.params.nested}`;
    next();
  };

  return router
    .get("/:resource/:id/:nested", get)
    .post("/:resource/:id/:nested", post);
}
