import { default as createServer, ExpressTestServer } from "@b4dnewz/express-test-server";
import objectToArgv from "@b4dnewz/object-to-argv";
import { ChildProcess, fork } from "child_process";
import * as fs from "fs-extra";
import { tmpdir } from "os";
import * as path from "path";
import * as serverReady from "server-ready";
import * as supertest from "supertest";
import * as tempWrite from "temp-write";

const fixturesPath = path.resolve(__dirname, "../../../fixtures");
const binPath = path.resolve(__dirname, "../src/index.ts");

function run(args: string[]) {
  return fork(binPath, args, {
    cwd: __dirname,
    execArgv: ["-r", "ts-node/register"],
    silent: true,
  });
}

describe("@json-server/cli execution", () => {

  jest.setTimeout(10000);

  let proc: ChildProcess;

  describe("local file", () => {
    const snapshotsDir = path.resolve(tmpdir(), "snapshots");
    const staticDir = path.resolve(fixturesPath, "public");
    const dbData = {
      user: {
        id: 1,
        name: "John",
      },
      posts: [{
        id: 1,
        body: "foo",
        userId: 1,
      }],
    };

    const dbFile = tempWrite.sync(JSON.stringify(dbData), "db.json");
    const routesFile = tempWrite.sync(JSON.stringify({
      "/api/*": "/$1",
    }), "routes.json");

    let request: supertest.SuperTest<supertest.Test>;

    beforeAll((done) => {
      fs.ensureDirSync(snapshotsDir);
      fs.emptyDirSync(snapshotsDir);
      proc = run(objectToArgv({
        [dbFile]: null,
        watch: true,
        snapshots: snapshotsDir,
        static: staticDir,
        routes: routesFile,
      }));
      request = supertest("http://localhost:3000");
      serverReady(3000, done);
    });

    afterAll((done) => {
      proc.kill("SIGTERM");
      proc.once("exit", () => done());
    });

    it("should respond with data", async () => {
      await request.get("/db")
        .expect(dbData)
        .expect(200);
    });

    it("should use custom routes", async () => {
      await request.get("/api/user")
        .expect(dbData.user)
        .expect(200);
    });

    it("should use custom static dir", async () => {
      await request.get("/")
        .expect(/JSON Server/)
        .expect(200);
    });

    it("should write snapshot to disk", (done) => {
      proc.stdin.write("s\n");

      setTimeout(() => {
        const snapshots = fs.readdirSync(snapshotsDir)
          .map((s) => path.resolve(snapshotsDir, s));
        expect(snapshots.length).toBe(1);
        expect(fs.readJsonSync(snapshots[0])).toEqual(dbData);
        done();
      }, 1000);
    });

    it("should reload the server", (done) => {
      proc.stdin.write("r\n");

      request.get("/db")
        .expect(200)
        .end((err) => {
          expect(err).toBeDefined();
          expect(err.code).toEqual("ECONNREFUSED");

          setTimeout(() => {
            request.get("/db")
              .expect(200)
              .end(done);
          }, 1000);
        });
    });

    it("should update the file content", async () => {
      const expected = { id: 2, body: "bar" };
      const { body } = expected;
      await request.post("/posts")
        .send({ body })
        .expect(expected)
        .expect(201);
      const content = fs.readJsonSync(dbFile);
      expect(content.posts).toContainEqual(expected);
    });

    it("should watch routes file and reload", (done) => {
      fs.writeJsonSync(routesFile, {
        "/profile": "/user",
      }, { encoding: "utf8" });

      setTimeout(() => {
        request.get("/profile")
          .expect(dbData.user)
          .expect(200)
          .end(done);
      }, 1000);
    });

    it("should watch db file and reload", (done) => {
      const newData = {
        users: [{
          id: 1,
          name: "Foo",
        }],
      };
      fs.writeJsonSync(dbFile, newData, { encoding: "utf8" });
      setTimeout(() => {
        request.get("/db")
          .expect(newData)
          .expect(200)
          .end(done);
      }, 1000);
    });
  });

  describe("remote file", () => {
    const dbData = {
      user: {
        id: 1,
        name: "john",
      },
      posts: [{
        id: 1,
        body: "foo",
        userId: 1,
      }],
    };

    let server: ExpressTestServer;
    let request: supertest.SuperTest<supertest.Test>;

    beforeAll((done) => {
      createServer().then((serv) => {
        server = serv;
        server.get("/db.json", dbData);

        proc = run([`${server.url}/db.json`]);
        request = supertest("http://localhost:3000");
        serverReady(3000, done);
      });
    });

    afterAll((done) => {
      proc.kill("SIGTERM");
      proc.once("exit", () => done());
    });

    it("should respond with data", async () => {
      await request.get("/db")
        .expect(dbData)
        .expect(200);
    });
  });

  describe("seed file", () => {
    const dbFile = path.resolve(fixturesPath, "db.js");
    let request: supertest.SuperTest<supertest.Test>;

    beforeAll((done) => {
      proc = run([dbFile]);
      request = supertest("http://localhost:3000");
      serverReady(3000, done);
    });

    afterAll((done) => {
      proc.kill("SIGTERM");
      proc.once("exit", () => done());
    });

    it("should respond with data", async () => {
      await request.get("/db").expect(200);
    });

    it("should reload the server and database", (done) => {
      request.get("/db")
        .expect(200)
        .end((err, res) => {
          const data = res.body;

          // trigger manual reload
          proc.stdin.write("r\n");

          setTimeout(() => {
            serverReady(3000, () => {
              request.get("/db")
                .expect((r) => {
                  expect(r.body).not.toEqual(data);
                })
                .expect(200)
                .end(done);
            });
          }, 1000);
        });
    });
  });

});
