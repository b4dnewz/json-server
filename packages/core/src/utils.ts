import * as _ from "lodash";
import * as low from "lowdb";
import * as FileSync from "lowdb/adapters/FileSync";
import * as Memory from "lowdb/adapters/Memory";
import * as pluralize from "pluralize";

interface PaginationObject {
  items: any[];
  start: number;
  end: number;
  current: number;
  first: number;
  last: number;
  prev: number;
  next: number;
}

export function initDatabase(obj: any) {
  let db: low.LowdbSync<any>;
  if (typeof obj === "string") {
    db = low(new FileSync(obj));
  } else if (!_.has(obj, "__chain__") || !_.has(obj, "__wrapped__")) {
    db = low(new Memory(obj)).setState(obj);
  }
  return db;
}

/**
 * Function to filter the resource fields
 * based on a comma separated list of field property names
 */
export function fields(resource, e) {
  if (!e || e === "") {
    return resource;
  }

  const isChain = resource.__chain__;
  const value = isChain ? resource.value() : resource;

  const fieldSet = e.split(",");
  const result = _.isArray(value)
    ? _.map(value, (r) => _.pick(r, fieldSet))
    : _.pick(value, fieldSet);
  return isChain ? _.chain(result) : result;
}

/**
 * Function to embed values of the resource
 * based on a comma separated list of field names
 */
export function embed(resource, name, db, opts, e) {
  if (!e) {
    return resource;
  }

  [].concat(e).forEach((externalResource) => {
    const ext = db.get(externalResource);
    if (ext.value()) {
      const query = {};
      const singularResource = pluralize.singular(name);
      query[`${singularResource}${opts.foreignKeySuffix}`] =
        resource.id || resource.get("id").value();
      const filteredValue = ext.filter(query).value();
      if (resource.__chain__) {
        resource.set(externalResource, filteredValue).write();
      } else {
        resource[externalResource] = filteredValue;
      }
    }
  });

  return resource;
}

/**
 * Function to expand values of the resource
 * based on a comma separated list of field names
 */
export function expand(resource, db, opts, e) {
  if (!e) {
    return resource;
  }

  [].concat(e).forEach((innerResource) => {
    const plural = pluralize(innerResource);
    const prop = `${innerResource}${opts.foreignKeySuffix}`;
    const resId = resource[prop] || resource.get(prop).value();
    if (!_.isUndefined(resId) && db.get(plural).value()) {
      const value = db
        .get(plural)
        .getById(resId)
        .value();
      if (resource.__chain__) {
        resource.set(innerResource, value).write();
      } else {
        resource[innerResource] = value;
      }
    }
  });

  return resource;
}

/**
 * Function to return the pagination details object
 */
export function getPage(array, page, perPage) {
  const obj: Partial<PaginationObject> = {};
  const start = (page - 1) * perPage;
  const end = page * perPage;

  obj.items = array.slice(start, end);
  if (obj.items.length === 0) {
    return obj;
  }

  if (page > 1) {
    obj.prev = page - 1;
  }

  if (end < array.length) {
    obj.next = page + 1;
  }

  if (obj.items.length !== array.length) {
    obj.current = page;
    obj.first = 1;
    obj.last = Math.ceil(array.length / perPage);
  }

  return obj;
}
