import * as fs from "fs";
import * as getPort from "get-port";
import * as parseJson from "json-parse-better-errors";
import * as _ from "lodash";
import * as path from "path";

import createApp from "./create-app";
import load from "./load";
import { clearScreen, indentLog, printJsonError, printState } from "./utils";
import * as is from "./utils";

export interface StartOptions {
  quiet: boolean;
  middlewares: string[];
  snapshots: string;
  routes: string;
  port: number;
  host: string;
  watch: boolean;
  foreignKeySuffix: string;
  fake: boolean;
}

export default async function (source: string, opts: StartOptions) {

  let app: any;
  let server: any;

  // Suppress any console output
  if (opts.quiet) {
    console.log = () => { return; };
  }

  // FIXME: Temporary fix for unmatched option key name
  // @see: https://github.com/b4dnewz/clito for flag names normalization
  opts.foreignKeySuffix = (opts as any).fks;

  async function start(reload = false) {

    if (reload) {
      clearScreen();
    }

    // Reset server variables
    app = null;
    server = null;

    // Get an available port using as preferences
    // any user provided port or the app preferred port
    const port = await getPort({
      port: opts.port || 3000,
    });
    const appOptions = {
      ...opts,
      port,
    };

    // If user entered a port and could not be used
    // just fail with an error message
    // otherwise set the random choosen port as option
    // so it will be persistent through reloads
    if (opts.port && port !== opts.port) {
      console.error(`The port ${opts.port} is already in use.`);
      process.exit(1);
    } else {
      opts.port = port;
    }

    // Load the database object data
    indentLog(`Loading "${source}"`);
    const data = await load(source);

    // Load application middlewares
    if (opts.middlewares) {
      appOptions.middlewares = opts.middlewares.map((m) => {
        indentLog(`Loading "${m}"`);
        return require(path.resolve(m));
      });
    }

    // Load server rewrite routes
    if (opts.routes) {
      indentLog(`Loading "${opts.routes}"`);
      appOptions.routes = JSON.parse(fs.readFileSync(opts.routes, "utf-8"));
    }

    // Create JSON Server application
    app = await createApp(data, appOptions);

    // Start the server using options
    server = app.listen(port, opts.host);

    // Print the server state and available routes
    printState(app.db.getState(), appOptions);

  }

  // Run the server
  return start()
    .then(() => {
      process.stdin.setEncoding("utf8");

      // Support for nohup
      process.stdin.on("error", () => {
        indentLog(`Error, can't read from stdin`, "red");
        indentLog(`Creating a snapshot from the CLI won't be possible`, "red");
      });

      // Capture stding keypress
      process.stdin.on("data", (chunk) => {
        const char = chunk.trim().toLowerCase();
        switch (char) {
          case "s":
            const filename = `db-${Date.now()}.json`;
            const file = path.join(opts.snapshots, filename);
            const state = app.db.getState();
            fs.writeFileSync(file, JSON.stringify(state, null, 2), "utf-8");
            indentLog(`Saved snapshot to ${path.relative(process.cwd(), file)}\n`, "dim");
            break;
          case "r":
            server.close(() => start(true));
            break;
          default:
            break;
        }
      });

      indentLog("Type [r + enter] at any time to restart the server"),
        indentLog("Type [s + enter] at any time to create a snapshot of the database\n");

      // Watch source file and rules route file
      if (opts.watch) {
        indentLog("Watching sources... \n");

        // Can't watch URL
        if (is.isURL(source)) { throw new Error("Can't watch on URL"); }

        // Watch .js or .json file
        // Since lowdb uses atomic writing, directory is watched instead of file
        const watchedDir = path.dirname(source);
        fs.watch(watchedDir, ({ }, file) => {
          if (file) {
            const watchedFile = path.resolve(watchedDir, file);
            if (watchedFile === path.resolve(source)) {
              if (is.isJSONFile(watchedFile)) {
                let obj;
                try {
                  obj = parseJson(fs.readFileSync(watchedFile, "utf-8"));
                } catch (e) {
                  printJsonError(e, watchedFile);
                  return;
                }

                // Compare .json file content with in memory database
                if (_.isEqual(obj, app.db.getState())) { return; }

                // If source has changed reload the application
                if (server) {
                  indentLog(`${source} has changed, reloading...`);
                  server.close(() => start(true));
                }
              }
            }
          }
        });

        // Watch routes
        if (opts.routes) {
          const watchedFile = path.resolve(opts.routes);
          fs.watchFile(watchedFile, { interval: 1000 }, (curr, prev) => {
            if (+curr.mtime === +prev.mtime) {
              return;
            }

            try {
              JSON.parse(fs.readFileSync(watchedFile, "utf-8"));
            } catch (e) {
              printJsonError(e, watchedFile);
              return;
            }

            // If source has changed reload the application
            if (server) {
              indentLog(`${opts.routes} has changed, reloading...`),
                server.close(() => start(true));
            }
          });
        }
      }

      return server;
    }).catch((err) => {
      console.error(err);
      process.exit(1);
    });

}
