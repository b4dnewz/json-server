import * as express from "express";
import * as _ from "lodash";
import { LowdbSync } from "lowdb";

import * as utils from "../utils";
import delay from "./delay";
import getFullURL from "./get-full-url";
import { RouterOptions } from "./index";
import write from "./write";

interface PaginationLinks {
  first?: string;
  last?: string;
  prev?: string;
  next?: string;
}

export default function(db: any, name: string, opts: RouterOptions) {
  const router = express.Router();
  router.use(delay);

  /**
   * GET /name
   * GET /name?q=
   * GET /name?attr=&attr=
   * GET /name?_end=&
   * GET /name?_start=&_end=&
   * GET /name?_embed=&_expand=
   */
  const list: express.RequestHandler = (req, res, next) => {
    let chain = db.get(name);

    // Remove custom filter parameters from query
    // after saving them into variables
    let q = req.query.q;
    let _start = req.query._start;
    let _end = req.query._end;
    let _page = req.query._page;
    const _sort = req.query._sort;
    const _field = req.query._field;
    const _order = req.query._order;
    let _limit = req.query._limit;
    const _embed = req.query._embed;
    const _expand = req.query._expand;

    delete req.query.q;
    delete req.query._start;
    delete req.query._end;
    delete req.query._sort;
    delete req.query._field;
    delete req.query._order;
    delete req.query._limit;
    delete req.query._embed;
    delete req.query._expand;

    // Automatically delete query parameters that can't be found
    // in the database
    Object.keys(req.query).forEach((query) => {
      const arr = db.get(name).value();
      for (const i in arr) {
        if (
          _.has(arr[i], query) ||
          query === "callback" ||
          query === "_" ||
          /_lte$/.test(query) ||
          /_gte$/.test(query) ||
          /_ne$/.test(query) ||
          /_like$/.test(query)
        ) {
          return;
        }
      }
      delete req.query[query];
    });

    // Full-text search
    if (q) {
      if (Array.isArray(q)) {
        q = q[0];
      }

      q = q.toLowerCase();

      chain = chain.filter((obj) => {
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            if (db._.deepQuery(value, q)) {
              return true;
            }
          }
        }
      });
    }

    // Filter resource by query parameters
    Object.keys(req.query).forEach((key) => {
      // Don't take into account JSONP query parameters
      // jQuery adds a '_' query parameter too
      if (["callback", "_"].includes(key)) {
        return;
      }

      // Always use an array, in case req.query is an array
      const arr = [].concat(req.query[key]);

      const isDifferent = /_ne$/.test(key);
      const isRange = /_lte$/.test(key) || /_gte$/.test(key);
      const isLike = /_like$/.test(key);
      const path = key.replace(/(_lte|_gte|_ne|_like)$/, "");

      // Filter resources
      chain = chain.filter((element) => {
        return arr
          .map((value) => {
            // get item value based on path
            // i.e post.title -> 'foo'
            const elementValue = _.get(element, path);

            // Prevent toString() failing on undefined or null values
            if (elementValue === undefined || elementValue === null) {
              return;
            }

            if (isRange) {
              const isLowerThan = /_gte$/.test(key);

              return isLowerThan
                ? value <= elementValue
                : value >= elementValue;
            } else if (isDifferent) {
              return value !== elementValue.toString();
            } else if (isLike) {
              return new RegExp(value, "i").test(elementValue.toString());
            } else {
              return value === elementValue.toString();
            }
          })
          .reduce((a, b) => isDifferent ? a && b :  a || b);
      });
    });

    // Sort by multiple fields and orders (case insensitive)
    if (_sort) {
      const sortSet = _sort.split(",");
      const orderSet = (_order || "").split(",").map((s) => s.toLowerCase());
      chain = chain.orderBy(sortSet, orderSet);
    }

    // Slice result and add headers
    if (_end || _limit || _page) {
      res.setHeader("X-Total-Count", chain.size());
      res.setHeader(
        "Access-Control-Expose-Headers",
        `X-Total-Count${_page ? ", Link" : ""}`,
      );
    }

    if (_page) {
      _page = parseInt(_page, 10);
      _page = _page >= 1 ? _page : 1;
      _limit = parseInt(_limit, 10) || 10;

      const page = utils.getPage(chain.value(), _page, _limit);
      const fullURL = getFullURL(req);
      const links: PaginationLinks = {};

      if (page.first) {
        links.first = fullURL.replace(
          `page=${page.current}`,
          `page=${page.first}`,
        );
      }

      if (page.prev) {
        links.prev = fullURL.replace(
          `page=${page.current}`,
          `page=${page.prev}`,
        );
      }

      if (page.next) {
        links.next = fullURL.replace(
          `page=${page.current}`,
          `page=${page.next}`,
        );
      }

      if (page.last) {
        links.last = fullURL.replace(
          `page=${page.current}`,
          `page=${page.last}`,
        );
      }

      res.links(links);
      chain = _.chain(page.items);
    } else if (_end) {
      _start = parseInt(_start, 10) || 0;
      _end = parseInt(_end, 10);
      chain = chain.slice(_start, _end);
    } else if (_limit) {
      _start = parseInt(_start, 10) || 0;
      _limit = parseInt(_limit, 10);
      chain = chain.slice(_start, _start + _limit);
    }

    // embed and expand
    chain = chain.cloneDeep().forEach((element) => {
      utils.embed(element, name, db, opts, _embed);
      utils.expand(element, db, opts, _expand);
    });

    // Filter fields to return
    if (_field) {
      chain = utils.fields(chain, _field);
    }

    res.locals.data = chain.value();

    next();
  };

  /**
   * GET /name/:id
   * GET /name/:id?_embed=&_expand
   */
  const show: express.RequestHandler = (req, res, next) => {
    const _field = req.query._field;
    const _embed = req.query._embed;
    const _expand = req.query._expand;
    const resource = db
      .get(name)
      .getById(req.params.id)
      .value();

    if (resource) {
      // Clone resource to avoid making changes to the underlying object
      let clone = _.cloneDeep(resource);

      // Apply filters
      clone = utils.expand(clone, db, opts, _expand);
      clone = utils.embed(clone, name, db, opts, _embed);
      clone = utils.fields(clone, _field);

      res.locals.data = clone;
    }

    next();
  };

  /**
   * POST /name
   */
  const create: express.RequestHandler = (req, res, next) => {
    const body = req.body;
    let resource: any;

    if (_.isArray(body)) {

      if (opts.isFake) {
        const id = db
          .get(name)
          .createId()
          .value();
        resource = body.map((r, i) => ({
          ...r,
          id: id + i,
        }));
      } else {
        resource = body.map((r) => db
          .get(name)
          .insert(r)
          .value(),
        );
      }

    } else {

      if (opts.isFake) {
        const id = db
          .get(name)
          .createId()
          .value();
        resource = { ...body, id };
      } else {
        resource = db
          .get(name)
          .insert(body)
          .value();
      }

      res.setHeader("Access-Control-Expose-Headers", "Location");
      res.location(`${getFullURL(req)}/${resource.id}`);

    }

    res.status(201);
    res.locals.data = resource;

    next();
  };

  /**
   * PUT /name/:id
   * PATCH /name/:id
   */
  const update: express.RequestHandler = (req, res, next) => {
    const id = req.params.id;
    let resource: any;

    if (opts.isFake) {

      resource = db
        .get(name)
        .getById(id)
        .value();

      if (resource) {
        resource = req.method === "PATCH"
          ? { ...resource, ...req.body }
          : { ...req.body, id: resource.id };
      }

    } else {

      let chain = db.get(name);

      chain = req.method === "PATCH"
        ? chain.updateById(id, req.body)
        : chain.replaceById(id, req.body);

      resource = chain.value();

    }

    res.locals.data = resource;
    next();
  };

  /**
   * DELETE /name/:id
   */
  const destroy: express.RequestHandler = (req, res, next) => {
    let resource: any;

    if (opts.isFake) {
      resource = db.get(name).value();
    } else {
      resource = db
        .get(name)
        .removeById(req.params.id)
        .value();

      // Remove dependents documents
      const removable = db._.getRemovable(db.getState(), opts);
      removable.forEach((item) => {
        db.get(item.name)
          .removeById(item.id)
          .value();
      });
    }

    // If resource was found reset the data property
    if (resource) {
      res.locals.data = {};
    }

    next();
  };

  const w = write(db);

  router
    .route("/")
    .get(list)
    .post(create, w);

  router
    .route("/:id")
    .get(show)
    .put(update, w)
    .patch(update, w)
    .delete(destroy, w);

  return router;
}
