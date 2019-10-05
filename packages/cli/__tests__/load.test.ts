import createServer from "@b4dnewz/express-test-server";
import * as path from "path";

import load from "../src/load";

const fixturesPath = path.resolve(__dirname, "../../../fixtures");

describe("@json-server/cli loader", () => {

  it("should reject when source not supported", async () => {
    await expect(load("source.yml")).rejects.toMatch(/Unsupported source/);
  });

  it("should reject when file does not exist", async () => {
    await expect(load("db.json")).rejects.toMatch(/doesn't seem to exist/);
  });

  it("should resolve local JSON file", async () => {
    const filename = path.resolve(fixturesPath, "db.json");
    await expect(load(filename)).resolves.toBe(filename);
  });

  it("should resolve local JS file", async () => {
    const filename = path.resolve(fixturesPath, "db.js");
    await expect(load(filename)).resolves.toMatchObject({
      user: expect.any(Object),
      posts: expect.any(Array),
    });
  });

  it("should reject if local JS file does not export a function", async () => {
    const filename = path.resolve(fixturesPath, "error.js");
    await expect(load(filename)).rejects.toMatch(/the export is not a function/);
  });

  it("should load remote JSON file", async () => {
    const server = await createServer();
    const data = {
      user: {
        id: 1,
        name: "john",
      },
      posts: [{
        id: 1,
        body: "foo",
      }],
    };
    server.get("/db.json", data);
    await expect(load(`${server.url}/db.json`)).resolves.toMatchObject(data);
    await server.close();
  });

  it("should reject if remote file does not exist", async () => {
    const server = await createServer();
    server.get("/db.json", (req, res) => {
      res.status(404).send("Not Found");
    });
    await expect(load(`${server.url}/db.json`)).rejects.toEqual("Not Found");
    await server.close();
  });

});
