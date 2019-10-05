import * as fs from "fs";
import * as path from "path";
import * as request from "request";

import {isJSFile, isJSONFile, isURL} from "./utils";

/**
 * Function to load the database object
 * from various sources that can be local or remote
 */
export default function(source: string) {
  return new Promise((resolve, reject) => {
    if (isJSONFile(source)) {
      if (!fs.existsSync(source)) {
        reject(`"${source}" doesn't seem to exist`);
        return;
      }

      resolve(source);
    } else if (isURL(source)) {
      request({
        url: source,
        json: true,
      }, (err, response) => {
        if (err) {
          reject(err);
          return;
        }

        if (response.statusCode !== 200) {
          reject(response.statusMessage);
          return;
        }

        resolve(response.body);
      });
    } else if (isJSFile(source)) {
      // Clear file cache to load fresh instance
      const filename = path.resolve(source);
      delete require.cache[filename];

      // Resolve local file
      const dataFn = require(filename);
      if (typeof dataFn !== "function") {
        reject("The database is a JavaScript file but the export is not a function.");
        return;
      }

      // Run dataFn to generate data object
      const data = dataFn();
      resolve(data);
    } else {
      reject(`Unsupported source "${source}"`);
    }
  });
}
