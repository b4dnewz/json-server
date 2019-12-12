import createServer from "@b4dnewz/express-test-server";
import * as temp from "@b4dnewz/temp";
import load from "../src/load";

describe("@json-server/cli loader", () => {

  let tmpDir: temp.DirAsync;

  beforeAll(async () => {
    tmpDir = await temp.dir("fixtures");
  });

  afterAll(async () => {
    await tmpDir.remove();
  });

  it("should reject when source not supported", async () => {
    await expect(load("source.yml")).rejects.toMatch(/Unsupported source/);
  });

  it("should reject when file does not exist", async () => {
    await expect(load("db.json")).rejects.toMatch(/doesn't seem to exist/);
  });

  it("should resolve local JSON file", async () => {
    const tmpFile = await tmpDir.file({}, {
      name: "db.json",
    });
    await expect(load(tmpFile.path)).resolves.toBe(tmpFile.path);
  });

  it("should resolve local JS file", async () => {
    const tmpFile = await tmpDir.file(`
      module.exports = function() {
        return {
          user: {},
          posts: []
        }
      }
    `, {
      name: "db.js",
    });
    await expect(load(tmpFile.path)).resolves.toMatchObject({
      user: expect.any(Object),
      posts: expect.any(Array),
    });
  });

  it("should reject if local JS file does not export a function", async () => {
    const tmpFile = await tmpDir.file(`
      module.exports = {
        user: {
          id: 1,
          name: "John"
        }
      };
    `, {
      name: "error.js",
    });
    await expect(load(tmpFile.path)).rejects.toMatch(/the export is not a function/);
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
    server.get("/db.json", ({}, res) => {
      res.status(404).send("Not Found");
    });
    await expect(load(`${server.url}/db.json`)).rejects.toEqual("Not Found");
    await server.close();
  });

});
