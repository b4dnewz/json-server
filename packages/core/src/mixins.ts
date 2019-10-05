import * as nanoId from "nanoid";
import {plural} from "pluralize";

import {RouterOptions} from "./router/index";

declare module "lodash" {
  interface LoDashStatic {
    getRemovable(db: any, opts: any): any[];
    createId(coll: any): any;
    deepQuery(value: any, q: string): boolean;
  }
}

// Returns document ids that have unsatisfied relations
// Example: a comment that references a post that doesn't exist
export function getRemovable(db: any, opts: RouterOptions) {
  const _ = this;
  const removable = [];
  _.each(db, (coll, collName) => {
    _.each(coll, (doc) => {
      _.each(doc, (value, key) => {
        if (new RegExp(`${opts.foreignKeySuffix}$`).test(key)) {
          // Remove foreign key suffix and pluralize it
          // Example postId -> posts
          const refName = plural(
            key.replace(new RegExp(`${opts.foreignKeySuffix}$`), ""),
          );
          // Test if table exists
          if (db[refName]) {
            // Test if references is defined in table
            const ref = _.getById(db[refName], value);
            if (_.isUndefined(ref)) {
              removable.push({ name: collName, id: doc.id });
            }
          }
        }
      });
    });
  });
  return removable;
}

// Return incremented id or uuid
// Used to override lodash-id's createId with utils.createId
export function createId(coll) {
  const _ = this;
  const idProperty = _.__id();
  if (_.isEmpty(coll)) {
    return 1;
  }

  // Increment integer id or generate string id
  let id = _(coll).maxBy(idProperty)[idProperty];
  return _.isFinite(id) ? ++id : nanoId(7);
}

export function deepQuery(value: any, q: string) {
  const _ = this;
  if (value && q) {
    if (_.isArray(value)) {
      for (const v of value) {
        if (_.deepQuery(v, q)) {
          return true;
        }
      }
    } else if (_.isObject(value) && !_.isArray(value)) {
      for (const k in value) {
        if (_.deepQuery(value[k], q)) {
          return true;
        }
      }
    } else if (
      value
        .toString()
        .toLowerCase()
        .indexOf(q) !== -1
    ) {
      return true;
    }
  }
}
