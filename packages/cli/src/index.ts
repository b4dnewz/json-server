import clito from "clito";
import start from "./start";

// Initialize the command parser
const cli = clito({
  usage: "$ json-server [options] <input>",
  flags: {
    // @ts-ignore
    "auth": {
      description: "Add JWT authentication middlewares",
    },
    "port": {
      type: "number",
      alias: "p",
      description: "Set server port",
      default: 3000,
    },
    "host": {
      type: "string",
      alias: "h",
      description: "Set server hostname",
      default: "localhost",
    },
    "watch": {
      type: "boolean",
      alias: "w",
      description: "Watch server file(s)",
    },
    "fake": {
      type: "boolean",
      alias: "f",
      description: "Set server as fake",
      default: false,
    },
    "routes": {
      type: "string",
      alias: "r",
      description: "Path to routes file",
    },
    "middlewares": {
      type: "string",
      alias: "m",
      multiple: true,
      description: "Paths to middleware files",
    },
    "static": {
      type: "string",
      alias: "s",
      description: "Set static files directory",
    },
    "read-only": {
      type: "boolean",
      alias: "ro",
      description: "Allow only GET requests",
      default: false,
    },
    "cors": {
      type: "boolean",
      alias: "nc",
      description: "Disable Cross-Origin Resource Sharing",
      default: true,
    },
    "gzip": {
      type: "boolean",
      alias: "ng",
      description: "Disable GZIP Content-Encoding",
      default: true,
    },
    "snapshots": {
      type: "string",
      alias: "S",
      description: "Set snapshots directory",
      default: ".",
    },
    "delay": {
      type: "number",
      alias: "d",
      description: "Add delay to responses (ms)",
    },
    "id": {
      type: "string",
      alias: "i",
      description: "Set database id property (e.g. _id)",
      default: "id",
    },
    "foreign-key-suffix": {
      type: "string",
      alias: "fks",
      description: "Set foreign key suffix (e.g. _id as in post_id)",
      default: "Id",
    },
    "quiet": {
      type: "boolean",
      alias: "q",
      description: "Suppress log messages from output",
    },
  },
});

// Get the parsed values
const { input, flags } = cli;
const source = input[0];

// Validate source input
if (!source) {
  console.error("You need to specify a source, otherwise it wont work.");
  process.exit(1);
}

// Run the server
start(source, flags as any);
