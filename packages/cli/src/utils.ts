import chalk from "chalk";
import * as indent from "indent-string";

export function isJSONFile(s) {
  return !isURL(s) && /\.json$/.test(s);
}

export function isJSFile(s) {
  return !isURL(s) && /\.js$/.test(s);
}

export function isURL(s) {
  return /^(http|https):/.test(s);
}

export function clearScreen() {
  console.log("\u001B[2J\u001B[0;0f");
}

export function indentLog(msg, color = "gray") {
  console.log(chalk[color](indent(msg, 2)));
}

export function printJsonError(e, file) {
  clearScreen();
  console.log(chalk.red(indent(`Error reading ${file} \n`, 2)));
  console.error(indent(e.message, 2));
}

export function printState(state, opts) {
  const {host, port, routes} = opts;
  const root = `http://${opts.host}:${opts.port}`;

  console.log(chalk.bold("\n  Resources"));
  for (const prop in state) {
    if (state.hasOwnProperty(prop)) {
      console.log(`  ${root}/${prop}`);
    }
  }

  if (routes && Object.keys(routes).length) {
    console.log(chalk.bold("\n  Other routes"));
    for (const rule in routes) {
      if (routes.hasOwnProperty(rule)) {
        console.log(`  ${rule} -> ${routes[rule]}`);
      }
    }
  }

  console.log(chalk.bold("\n  Home"));
  console.log(`  ${root}`, "\n");
}
