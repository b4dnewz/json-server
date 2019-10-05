import * as _ from "lodash";
import * as path from "path";
import * as request from "supertest";
import {JsonServer} from "../src";

import {createRewriter, createRouter, createServer} from "../src";

const fixturesPath = path.resolve(__dirname, "../../../fixtures");

describe("@json-server/core:base", () => {
  let server: JsonServer;
  let db;

  describe("options", () => {
    it("should expose configuration options", () => {
      const opts = {
        logger: true,
        pretty: 4,
        cors: false,
      };
      server = createServer(null, opts);
      expect(server.config).toMatchObject(opts);
    });

    describe("pretty", () => {
      it("should enable pretty json by default", () => {
        server = createServer(db);
        expect(server.get("json spaces")).toBe(2);
      });

      it("should use custom pretty json settings", () => {
        server = createServer(db, {
          pretty: 4,
        });
        expect(server.get("json spaces")).toBe(4);
      });

      it("should disable pretty json", () => {
        server = createServer(db, {
          pretty: false,
        });
        expect(server.get("json spaces")).toBeUndefined();
      });
    });

    describe("readonly", () => {
      beforeAll(() => {
        db = {
          posts: [{
            id: 1,
            body: "foo",
          }],
        };
        server = createServer(db, {
          readOnly: true,
        });
      });

      it("should allow /GET requests", () =>
        request(server)
          .get("/posts")
          .expect(db.posts)
          .expect(200));

      it("should prevent /POST requests", () =>
        request(server)
          .post("/posts")
          .send({ body: "foo" })
          .expect({})
          .expect(403));

      it("should prevent /PUT requests", () =>
        request(server)
          .put("/posts/1")
          .send({ body: "bar" })
          .expect({})
          .expect(403));

      it("should prevent /PATCH requests", () =>
        request(server)
          .patch("/posts/1")
          .send({ body: "foo" })
          .expect({})
          .expect(403));

      it("should prevent /DEL requests", () =>
        request(server)
          .del("/posts/1")
          .expect({})
          .expect(403));
    });

    describe("cors", () => {
      it("should add access control header by default", () => {
        server = createServer(db);
        return request(server)
          .get("/posts")
          .expect("Access-Control-Allow-Credentials", "true");
      });

      it("should use custom cors options", () => {
        server = createServer(db, {
          cors: {
            origin: "*",
          },
        });
        return request(server)
          .get("/posts")
          .expect("Access-Control-Allow-Origin", "*");
      });

      it("should disable access control header", (done) => {
        server = createServer(db, {
          cors: false,
        });
        request(server)
          .get("/posts")
          .end((err, res) => {
            if (err) {
              done(err);
              return;
            }

            expect(res.header).not.toHaveProperty("access-control-allow-credentials");
            done();
          });
      });
    });

    describe("static", () => {
      it("should use custom static directory", () => {
        server = createServer(null, {
          static: path.resolve(fixturesPath, "public"),
        });

        return request(server)
          .get("/")
          .expect(/Hello/)
          .expect(200);
      });
    });

    describe("middlewares", () => {
      it("should use defined middlewares", () => {
        server = createServer(null, {
          middlewares: [
            ({}, res, next) => {
              res.header("x-test", "hello");
              next();
            },
          ],
        });

        return request(server)
          .get("/testing")
          .expect("x-test", "hello")
          .expect(404);
      });
    });
  });

  describe("router", () => {
    let router;

    beforeEach(() => {
      db = {
        posts: [{
          id: 1,
          body: "foo",
        }],
      };
      router = createRouter(db);
      server = createServer();
      server.use(router);
    });

    it("should support local files", () => {
      router = createRouter(path.resolve(fixturesPath, "db.json"));
      expect(router.db).toBeDefined();
    });

    it("should expose the full database on /db", () =>
      request(server)
        .get("/db")
        .expect(db),
    );

    describe(".render", () => {
      beforeEach(() => {
        router.render = (req, res) => {
          res.jsonp({ data: res.locals.data });
        };
      });

      it("should be possible to wrap response", () =>
        request(server)
          .get("/posts/1")
          .expect("Content-Type", /json/)
          .expect({ data: db.posts[0] })
          .expect(200));
    });
  });

  describe("rewriter", () => {
    const rewriterRules = {
      "/api/*": "/$1",
      "/blog/posts/:id/show": "/posts/:id",
      "/comments/special/:userId-:body": "/comments/?userId=:userId&body=:body",
      "/firstpostwithcomments": "/posts/1?_embed=comments",
      "/articles?_id=:id": "/posts/:id",
    };

    beforeEach(() => {
      db = {
        posts: [{
          id: 1,
          body: "foo",
        }],
        comments: [
          { id: 1, body: "foo", published: true, postId: 1, userId: 1 },
          { id: 2, body: "bar", published: false, postId: 1, userId: 2 },
          { id: 3, body: "baz", published: false, postId: 2, userId: 1 },
          { id: 4, body: "qux", published: true, postId: 2, userId: 2 },
          { id: 5, body: "quux", published: false, postId: 2, userId: 1 },
        ],
      };
      server = createServer(db, {
        rewriter: createRewriter(rewriterRules),
      });
    });

    it("should rewrite all using prefix", async () => {
      await request(server)
        .get("/api/posts/1")
        .expect(db.posts[0]);

      await request(server)
        .get("/api/comments/1")
        .expect(db.comments[0]);
    });

    it("should rewrite using params", () =>
      request(server)
        .get("/blog/posts/1/show")
        .expect(db.posts[0]));

    it("should rewrite using query without params", () => {
      return request(server)
        .get("/firstpostwithcomments")
        .expect({
          ...db.posts[0],
          comments: [db.comments[0], db.comments[1]],
        });
    });

    it("should rewrite using params and query", () =>
      request(server)
        .get("/comments/special/1-quux")
        .expect([db.comments[4]]));

    it("should rewrite query params", () =>
      request(server)
        .get("/articles?_id=1")
        .expect(db.posts[0]));

    it("should expose routes", () =>
      request(server)
        .get("/__rules")
        .expect(rewriterRules));
  });

  describe("static routes", () => {
    beforeAll(() => {
      server = createServer();
    });

    describe("GET /", () => {
      it("should respond with html", () =>
        request(server)
          .get("/")
          .expect(/JSON Server/)
          .expect(200));
    });
  });
});
