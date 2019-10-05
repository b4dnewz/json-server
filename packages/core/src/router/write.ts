import {RequestHandler} from "express";
import {LowdbSync} from "lowdb";

/**
 * Update the database instance and call next middlware
 */
export default function write(db: LowdbSync<any>): RequestHandler {
  return ({}, {}, next) => {
    db.write();
    next();
  };
}
