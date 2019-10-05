import {Application} from "express";
import * as _ from "lodash";
import * as request from "supertest";
import {createServer} from "../src";

describe("@json-server/core:plural", () => {
  let db: any;
  let server: Application;

  describe("plural", () => {
    beforeEach(() => {
      db = {
        posts: [{ id: 1, body: "foo" }, { id: 2, body: "bar" }],
        tags: [
          { id: 1, body: "Technology" },
          { id: 2, body: "Photography" },
          { id: 3, body: "photo" },
        ],
        users: [
          { id: 1, username: "Jim", tel: "0123" },
          { id: 2, username: "George", tel: "123" },
        ],
        comments: [
          { id: 1, body: "foo", published: true, postId: 1, userId: 1 },
          { id: 2, body: "bar", published: false, postId: 1, userId: 2 },
          { id: 3, body: "baz", published: false, postId: 2, userId: 1 },
          { id: 4, body: "qux", published: true, postId: 2, userId: 2 },
          { id: 5, body: "quux", published: false, postId: 2, userId: 1 },
        ],
        buyers: [
          { id: 1, name: "Aileen", country: "Colombia", total: 100 },
          { id: 2, name: "Barney", country: "Colombia", total: 200 },
          { id: 3, name: "Carley", country: "Colombia", total: 300 },
          { id: 4, name: "Daniel", country: "Belize", total: 30 },
          { id: 5, name: "Ellen", country: "Belize", total: 20 },
          { id: 6, name: "Frank", country: "Belize", total: 10 },
          { id: 7, name: "Grace", country: "Argentina", total: 1 },
          { id: 8, name: "Henry", country: "Argentina", total: 2 },
          { id: 9, name: "Isabelle", country: "Argentina", total: 3 },
        ],
        deep: [{ a: { b: 1 } }, { a: 1 }],
        refs: [{ id: "abcd-1234", url: "http://example.com", postId: 1, userId: 1 }],
        nested: [
          { resource: { name: "dewey" } },
          { resource: { name: "cheatem" } },
          { resource: { name: "howe" } },
        ],
        list: [
          { id: 1 },
          { id: 2 },
          { id: 3 },
          { id: 4 },
          { id: 5 },
          { id: 6 },
          { id: 7 },
          { id: 8 },
          { id: 9 },
          { id: 10 },
          { id: 11 },
          { id: 12 },
          { id: 13 },
          { id: 14 },
          { id: 15 },
        ],
      };

      server = createServer(db);
    });

    describe("GET /:resource", () => {
      it("should respond with corresponding resources", () =>
        request(server)
          .get("/posts")
          .set("Origin", "http://example.com")
          .expect("Content-Type", /json/)
          .expect("Access-Control-Allow-Credentials", "true")
          .expect("Access-Control-Allow-Origin", "http://example.com")
          .expect(db.posts)
          .expect(200));

      it("should respond with 404 if resource is not found", () =>
        request(server)
          .get("/undefined")
          .expect(404));
    });

    describe("POST /:resource", () => {
      it("should support single insertion", () =>
        request(server)
          .post("/posts")
          .send({ body: "baz" })
          .expect({
            id: 3,
            body: "baz",
          })
          .expect(201));

      it("should support bulk insertion", () =>
        request(server)
          .post("/posts")
          .send([{ body: "baz" }, { body: "bat" }])
          .expect([{
            id: 3,
            body: "baz",
          }, {
            id: 4,
            body: "bat",
          }])
          .expect(201));
    });

    describe("GET /:resource?attr=&attr=", () => {
      it("should respond with filtered resources", () =>
        request(server)
          .get("/comments?postId=1&published=true")
          .expect("Content-Type", /json/)
          .expect([db.comments[0]])
          .expect(200));

      it("should be strict", () =>
        request(server)
          .get("/users?tel=123")
          .expect("Content-Type", /json/)
          .expect([db.users[1]])
          .expect(200));

      it("should support multiple filters", () =>
        request(server)
          .get("/comments?id=1&id=2")
          .expect("Content-Type", /json/)
          .expect([db.comments[0], db.comments[1]])
          .expect(200));

      it("should support deep filter", () =>
        request(server)
          .get("/deep?a.b=1")
          .expect("Content-Type", /json/)
          .expect([db.deep[0]])
          .expect(200));

      it("should ignore JSONP query parameters callback and _ ", () =>
        request(server)
          .get("/comments?callback=1&_=1")
          .expect("Content-Type", /text/)
          .expect(new RegExp(db.comments[0].body)) // JSONP returns text
          .expect(200));

      it("should ignore unknown query parameters", () =>
        request(server)
          .get("/comments?foo=1&bar=2")
          .expect("Content-Type", /json/)
          .expect(db.comments)
          .expect(200));

      // https://github.com/typicode/json-server/issues/510
      it("should not fail with null value", () => {
        db.posts.push({ id: 99, body: null });
        return request(server)
          .get("/posts?body=foo")
          .expect("Content-Type", /json/)
          .expect([db.posts[0]])
          .expect(200);
      });
    });

    describe("GET /:resource?q=", () => {
      it("should respond with json and make a full-text search", () =>
        request(server)
          .get("/tags?q=pho")
          .expect("Content-Type", /json/)
          .expect([db.tags[1], db.tags[2]])
          .expect(200));

      it("should respond with json and make a deep full-text search", () =>
        request(server)
          .get("/deep?q=1")
          .expect("Content-Type", /json/)
          .expect(db.deep)
          .expect(200));

      it("should return an empty array when nothing is matched", () =>
        request(server)
          .get("/tags?q=nope")
          .expect("Content-Type", /json/)
          .expect([])
          .expect(200));

      it("should support other query parameters", () =>
        request(server)
          .get("/comments?q=qu&published=true")
          .expect("Content-Type", /json/)
          .expect([db.comments[3]])
          .expect(200));

      it("should ignore duplicate q query parameters", () =>
        request(server)
          .get("/comments?q=foo&q=bar")
          .expect("Content-Type", /json/)
          .expect([db.comments[0]])
          .expect(200));

      it("should support filtering by boolean value false", () =>
        request(server)
          .get("/comments?published=false")
          .expect("Content-Type", /json/)
          .expect([db.comments[1], db.comments[2], db.comments[4]])
          .expect(200));
    });

    describe("GET /:resource?_sort=", () => {
      it("should respond items sorted on a field", () =>
        request(server)
          .get("/tags?_sort=body")
          .expect("Content-Type", /json/)
          .expect([db.tags[1], db.tags[0], db.tags[2]])
          .expect(200));

      it("should reverse sorting with _order=DESC", () => {
        request(server)
          .get("/tags?_sort=body&_order=DESC")
          .expect("Content-Type", /json/)
          .expect([db.tags[2], db.tags[0], db.tags[1]])
          .expect(200);

        request(server)
          .get("/tags?_sort=body&_order=desc")
          .expect("Content-Type", /json/)
          .expect([db.tags[2], db.tags[0], db.tags[1]])
          .expect(200);
      });

      it("should sort on numerical field", () =>
        request(server)
          .get("/posts?_sort=id&_order=DESC")
          .expect("Content-Type", /json/)
          .expect(db.posts.reverse())
          .expect(200));

      it("should sort on nested field", () =>
        request(server)
          .get("/nested?_sort=resource.name")
          .expect("Content-Type", /json/)
          .expect([db.nested[1], db.nested[0], db.nested[2]])
          .expect(200));

      it("should sort on multiple fields", () =>
        request(server)
          .get("/buyers?_sort=country,total&_order=asc,desc")
          .expect("Content-Type", /json/)
          .expect([
            db.buyers[8],
            db.buyers[7],
            db.buyers[6],
            db.buyers[3],
            db.buyers[4],
            db.buyers[5],
            db.buyers[2],
            db.buyers[1],
            db.buyers[0],
          ])
          .expect(200));
    });

    describe("GET /:resource?_field=", () => {
      it("should return only selected field", () =>
        request(server)
          .get("/users?_field=id")
          .expect("Content-Type", /json/)
          .expect(_.map(db.users, (u) => _.pick(u, ["id"])))
          .expect(200));

      it("should support multiple fields filter", () =>
        request(server)
          .get("/users?_field=id,username")
          .expect("Content-Type", /json/)
          .expect(_.map(db.users, (u) => _.pick(u, ["id", "username"])))
          .expect(200));
    });

    describe("GET /:resource?_start=&_end=", () => {
      it("should respond with a sliced array", () =>
        request(server)
          .get("/comments?_start=1&_end=2")
          .expect("Content-Type", /json/)
          .expect("X-Total-Count", db.comments.length.toString())
          .expect("Access-Control-Expose-Headers", "X-Total-Count")
          .expect(db.comments.slice(1, 2))
          .expect(200));
    });

    describe("GET /:resource?_start=&_limit=", () => {
      it("should respond with a limited array", () =>
        request(server)
          .get("/comments?_start=1&_limit=1")
          .expect("Content-Type", /json/)
          .expect("X-Total-Count", db.comments.length.toString())
          .expect("Access-Control-Expose-Headers", "X-Total-Count")
          .expect(db.comments.slice(1, 2))
          .expect(200));
    });

    describe("GET /:resource?attr_gte=&attr_lte=", () => {
      it("should respond with a limited array", () =>
        request(server)
          .get("/comments?id_gte=2&id_lte=3")
          .expect("Content-Type", /json/)
          .expect(db.comments.slice(1, 3))
          .expect(200));
    });

    describe("GET /:resource?attr_ne=", () => {
      it("should respond with a limited array", () =>
        request(server)
          .get("/comments?id_ne=1")
          .expect("Content-Type", /json/)
          .expect(db.comments.slice(1))
          .expect(200));

      it.skip("should accept multiple parameters", () =>
        request(server)
          .get("/comments?id_ne=1&id_ne=2")
          .expect("Content-Type", /json/)
          .expect(db.comments.slice(1))
          .expect(200));
    });

    describe("GET /:resource?attr_like=", () => {
      it("should respond with an array that matches the like operator (case insensitive)", () =>
        request(server)
          .get("/tags?body_like=photo")
          .expect("Content-Type", /json/)
          .expect([db.tags[1], db.tags[2]])
          .expect(200));
    });

    describe("GET /:resource?_embed=", () => {
      it("should respond with corresponding resources and embedded resources", () => {
        return request(server)
          .get("/posts?_embed=comments")
          .expect("Content-Type", /json/)
          .expect([{
            ...db.posts[0],
            comments: [db.comments[0], db.comments[1]],
          }, {
            ...db.posts[1],
            comments: [db.comments[2], db.comments[3], db.comments[4]],
          }])
          .expect(200);
      });
    });

    describe("GET /:resource?_expand=", () => {
      it("should respond with corresponding resource and expanded inner resources", () => {
        const refs = _.cloneDeep(db.refs);
        refs[0].post = db.posts[0];
        return request(server)
          .get("/refs?_expand=post")
          .expect("Content-Type", /json/)
          .expect(refs)
          .expect(200);
      });
    });

    describe("GET /:resource?_delay=", () => {
      it("should delay response", (done) => {
        const start: any = new Date();
        request(server)
          .get("/posts?_delay=1100")
          .expect(200, (err) => {
            const end: any = new Date();
            done(end - start > 1000 ? err : new Error("Request wasn't delayed"));
          });
      });
    });

    describe("GET /:resource?_page=", () => {
      it("should paginate", () =>
        request(server)
          .get("/list?_page=2")
          .expect("Content-Type", /json/)
          .expect("X-Total-Count", db.list.length.toString())
          .expect("Access-Control-Expose-Headers", "X-Total-Count, Link")
          .expect(db.list.slice(10, 20))
          .expect(200));
    });

    describe("GET /:resource?_page=&_limit=", () => {
      it("should paginate with a custom limit", () => {
        const link = [
          '<http://localhost/list?_page=1&_limit=1>; rel="first"',
          '<http://localhost/list?_page=1&_limit=1>; rel="prev"',
          '<http://localhost/list?_page=3&_limit=1>; rel="next"',
          '<http://localhost/list?_page=15&_limit=1>; rel="last"',
        ].join(", ");
        return request(server)
          .get("/list?_page=2&_limit=1")
          .set("host", "localhost")
          .expect("Content-Type", /json/)
          .expect("X-Total-Count", db.list.length.toString())
          .expect("link", link)
          .expect("Access-Control-Expose-Headers", "X-Total-Count, Link")
          .expect(db.list.slice(1, 2))
          .expect(200);
      });
    });

    describe("GET /:resource/:id", () => {
      it("should respond with corresponding resource", () =>
        request(server)
          .get("/posts/1")
          .expect("Content-Type", /json/)
          .expect(db.posts[0])
          .expect(200));

      it("should respond with 404 if resource is not found", () =>
        request(server)
          .get("/posts/9001")
          .expect("Content-Type", /json/)
          .expect({})
          .expect(404));
    });

    describe("PUT /:resource/:id", () => {
      it("should respond and replace resource", async () => {
        const post = { id: 1, booleanValue: true, integerValue: 1 };
        const res = await request(server)
          .put("/posts/1")
          .set("Accept", "application/json")
          .send(post)
          .expect("Content-Type", /json/)
          .expect(post)
          .expect(200);
        expect(res.body).toEqual(post);
        expect(db.posts[0]).toEqual(post);
      });

      it("should respond with 404 if resource is not found", () =>
        request(server)
          .put("/posts/9001")
          .send({ id: 1, body: "bar" })
          .expect("Content-Type", /json/)
          .expect({})
          .expect(404));
    });

    describe("PATCH /:resource/:id", () => {
      it("should respond with json and update resource", async () => {
        const partial = { body: "bar" };
        const post = { id: 1, body: "bar" };
        const res = await request(server)
          .patch("/posts/1")
          .send(partial)
          .expect("Content-Type", /json/)
          .expect(post)
          .expect(200);
        expect(res.body).toEqual(post);
        expect(db.posts[0]).toEqual(post);
      });

      it("should respond with 404 if resource is not found", () =>
        request(server)
          .patch("/posts/9001")
          .send({ body: "bar" })
          .expect("Content-Type", /json/)
          .expect({})
          .expect(404));
    });

    describe("DELETE /:resource/:id", () => {
      it("should respond with empty data, destroy resource and dependent resources", async () => {
        await request(server)
          .del("/posts/1")
          .expect({})
          .expect(200);
        expect(db.posts.length).toBe(1);
        expect(db.comments.length).toBe(3);
      });

      it("should respond with 404 if resource is not found", () =>
        request(server)
          .del("/posts/9001")
          .expect("Content-Type", /json/)
          .expect({})
          .expect(404));
    });

    describe("GET /:resource/:id?_embed=", () => {
      it("should respond with corresponding resources and embedded resources", () => {
        return request(server)
          .get("/posts/1?_embed=comments")
          .expect("Content-Type", /json/)
          .expect({
            ...db.posts[0],
            comments: [db.comments[0], db.comments[1]],
          })
          .expect(200);
      });
    });

    describe("GET /:resource/:id?_expand=", () => {
      it("should respond with corresponding resource and expanded inner resources", () => {
        const comment = _.cloneDeep(db.comments[0]);
        comment.post = db.posts[0];
        return request(server)
          .get("/comments/1?_expand=post")
          .expect("Content-Type", /json/)
          .expect(comment)
          .expect(200);
      });
    });

    describe("GET /:resource/:id?_field=", () => {
      it("should respond with corresponding filtered fields", () => {
        return request(server)
          .get("/posts/1?_field=body")
          .expect("Content-Type", /json/)
          .expect({
            body: db.posts[0].body,
          })
          .expect(200);
      });
    });

    describe("GET /:parent/:parentId/:resource", () => {
      it("should respond with corresponding nested resources", () =>
        request(server)
          .get("/posts/1/comments")
          .expect("Content-Type", /json/)
          .expect([db.comments[0], db.comments[1]])
          .expect(200));
    });

    describe("POST /:parent/:parentId/:resource", () => {
      it("should respond with json and set parentId", () =>
        request(server)
          .post("/posts/1/comments")
          .send({ body: "foo" })
          .expect("Content-Type", /json/)
          .expect({ id: 6, postId: 1, body: "foo" })
          .expect(201));

      it("should support bulk insertion", async () => {
        // numeric id
        await request(server)
          .post("/posts/1/comments")
          .send([
            { body: "foo" },
            { body: "bar"},
          ])
          .expect("Content-Type", /json/)
          .expect([{
            id: 6,
            postId: 1,
            body: "foo",
          }, {
            id: 7,
            postId: 1,
            body: "bar",
          }])
          .expect(201);

        // non numeric id
        await request(server)
          .post("/refs/abcd-1234/posts")
          .send([
            { body: "foo" },
            { body: "bar"},
          ])
          .expect("Content-Type", /json/)
          .expect([{
            id: 3,
            refId: "abcd-1234",
            body: "foo",
          }, {
            id: 4,
            refId: "abcd-1234",
            body: "bar",
          }])
          .expect(201);
      });
    });
  });

  describe("plural fake", () => {
    beforeEach(() => {
      db = {
        posts: [{ id: 1, body: "foo" }, { id: 2, body: "bar" }],
      };
      server = createServer(db, {
        isFake: true,
      });
    });

    describe("POST /:resource", () => {
      it("should not create a resource", async () => {
        await request(server)
          .post("/posts")
          .send({ body: "foo", booleanValue: true, integerValue: 1 })
          .expect("Access-Control-Expose-Headers", "Location")
          .expect("Location", /posts\/3$/)
          .expect("Content-Type", /json/)
          .expect({ id: 3, body: "foo", booleanValue: true, integerValue: 1 })
          .expect(201);
        expect(db.posts.length).toBe(2);
      });

      it("should not create multiple resource", async () => {
        await request(server)
          .post("/posts")
          .send([{ body: "baz" }, { body: "bat" }])
          .expect([{
            id: 3,
            body: "baz",
          }, {
            id: 4,
            body: "bat",
          }])
          .expect(201);
        expect(db.posts.length).toBe(2);
      });
    });

    describe("PUT /:resource/:id", () => {
      it("should not replace resource", async () => {
        const post = { id: 1, booleanValue: true, integerValue: 1 };
        const res = await request(server)
          .put("/posts/1")
          .set("Accept", "application/json")
          .send(post)
          .expect("Content-Type", /json/)
          .expect(post)
          .expect(200);
        expect(res.body).toEqual(post);
        expect(db.posts[0]).not.toEqual(post);
      });
    });

    describe("PATCH /:resource/:id", () => {
      it("should not update resource", async () => {
        const partial = { body: "bar" };
        const post = { id: 1, body: "bar" };
        const res = await request(server)
          .patch("/posts/1")
          .send(partial)
          .expect("Content-Type", /json/)
          .expect(post)
          .expect(200);
        expect(res.body).toEqual(post);
        expect(db.posts[0]).not.toEqual(post);
      });
    });

    describe("DELETE /:resource/:id", () => {
      it("should not destroy resource", async () => {
        await request(server)
          .del("/posts/1")
          .expect({})
          .expect(200);
        expect(db.posts.length).toBe(2);
      });
    });
  });

  describe("plural custom foreignKeySuffix", () => {
    beforeEach(() => {
      db = {
        posts: [
          { id: 1, body: "foo" },
          { id: 2, body: "bar" },
        ],
        comments: [
          { id: 1, post_id: 1 },
          { id: 2, post_id: 1 },
          { id: 3, post_id: 2 },
        ],
      };
      server = createServer(db, {
        foreignKeySuffix: "_id",
      });
    });

    describe("GET /:resource?_embed=", () => {
      it("should respond with corresponding resources and embedded resources", () => {
        request(server)
          .get("/posts?_embed=comments")
          .expect("Content-Type", /json/)
          .expect([{
            ...db.posts[0],
            comments: [db.comments[0], db.comments[1]],
          }, {
            ...db.posts[1],
            comments: [db.comments[2]],
          }])
          .expect(200);
      });
    });

    describe("GET /:resource?_expand=", () => {
      it("should respond with corresponding resource and expanded inner resources", () => {
        request(server)
          .get("/comments?_expand=post")
          .expect("Content-Type", /json/)
          .expect([{
            ...db.comments[0],
            post: db.posts[0],
          }, {
            ...db.comments[1],
            post: db.posts[0],
          }, {
            ...db.comments[2],
            post: db.posts[1],
          }])
          .expect(200);
      });
    });

    describe("GET /:resource/:id", () => {
      it("should respond with corresponding resource", () =>
        request(server)
          .get("/posts/1")
          .expect("Content-Type", /json/)
          .expect(db.posts[0])
          .expect(200));
    });

    describe("GET /:resource/:id?_embed=", () => {
      it("should respond with corresponding resources and embedded resources", () => {
        request(server)
          .get("/posts/1?_embed=comments")
          .expect("Content-Type", /json/)
          .expect({
            ...db.posts[0],
            comments: [db.comments[0], db.comments[1]],
          })
          .expect(200);
      });
    });

    describe("GET /:resource/:id?_expand=", () => {
      it("should respond with corresponding resource and expanded inner resources", () => {
        request(server)
          .get("/comments/1?_expand=post")
          .expect("Content-Type", /json/)
          .expect({
            ...db.comments[0],
            post: db.posts[0],
          })
          .expect(200);
      });
    });

    describe("DELETE /:resource/:id", () => {
      it("should respond with empty data, destroy resource and dependent resources", async () => {
        await request(server)
          .del("/posts/1")
          .expect({})
          .expect(200);
        expect(db.posts.length).toBe(1);
        expect(db.comments.length).toBe(1);
      });
    });

    describe("GET /:parent/:parentId/:resource", () => {
      it("should respond with corresponding nested resources", () =>
        request(server)
          .get("/posts/1/comments")
          .expect("Content-Type", /json/)
          .expect([db.comments[0], db.comments[1]])
          .expect(200));
    });

    describe("POST /:parent/:parentId/:resource", () => {
      it("should respond with json and set parentId", () =>
        request(server)
          .post("/posts/1/comments")
          .send({ body: "foo" })
          .expect("Content-Type", /json/)
          .expect({ id: 4, post_id: 1, body: "foo" })
          .expect(201));
    });
  });
});
