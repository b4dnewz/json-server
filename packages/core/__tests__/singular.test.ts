import { Application } from "express";
import * as _ from "lodash";
import * as request from "supertest";
import { createServer } from "../src";

describe("@json-server/core:singular", () => {
  let db: any;
  let server: Application;

  describe("singular", () => {
    beforeEach(() => {
      db = {
        user: {
          id: 1,
          name: "foo",
          email: "foo@example.com",
          groupId: 1,
        },
        groups: [{
          id: 1,
          name: "Developers",
        }],
        comments: [{
          id: 1,
          body: "foo",
          userId: 1,
        }],
      };
      server = createServer(db);
    });

    describe("GET /:resource", () => {
      it("should respond with corresponding resource", () =>
        request(server)
          .get("/user")
          .expect(db.user)
          .expect(200));
    });

    describe("GET /:resource?_field=", () => {
      it("should filter the response fields", async () => {
        await request(server)
          .get("/user?_field=name")
          .expect({
            name: db.user.name,
          })
          .expect(200);

        await request(server)
          .get("/user?_field=name,email")
          .expect({
            name: db.user.name,
            email: db.user.email,
          })
          .expect(200);
      });

    });

    describe("GET /:resource?_embed=", () => {
      it("should respond with corresponding resources and embedded resources", () =>
        request(server)
          .get("/user?_embed=comments")
          .expect({
            ...db.user,
            comments: [db.comments[0]],
          })
          .expect(200));
    });

    describe("GET /:resource?_expand=", () => {
      it("should respond with corresponding resources and expanded resources", () =>
        request(server)
          .get("/user?_expand=group")
          .expect({
            ...db.user,
            group: db.groups[0],
          })
          .expect(200));
    });

    describe("POST /:resource", () => {
      it("should create resource", () => {
        const user = { name: "bar" };
        return request(server)
          .post("/user")
          .send(user)
          .expect(user)
          .expect(201);
      });
    });

    describe("PUT /:resource", () => {
      it("should update resource", () => {
        const user = { name: "bar" };
        return request(server)
          .put("/user")
          .send(user)
          .expect(user)
          .expect(200);
      });
    });

    describe("PATCH /:resource", () => {
      it("should update resource", () =>
        request(server)
          .patch("/user")
          .send({ name: "bar" })
          .expect({
            ...db.user,
            name: "bar",
            email: "foo@example.com",
          })
          .expect(200));
    });
  });

  describe("singular fake", () => {

    beforeEach(() => {
      db = {
        user: {
          id: 1,
          name: "foo",
          email: "foo@example.com",
        },
      };
      server = createServer(db, {
        isFake: true,
      });
    });

    describe("POST /:resource", () => {
      it("should not create resource", async () => {
        const user = { name: "bar" };
        await request(server)
          .post("/user")
          .send(user)
          .expect(user)
          .expect(201);
        expect(db.user).not.toEqual(user);
      });
    });

    describe("PUT /:resource", () => {
      it("should not update resource", async () => {
        const user = { name: "bar" };
        await request(server)
          .put("/user")
          .send(user)
          .expect(user)
          .expect(200);
        expect(db.user).not.toEqual(user);
      });
    });

    describe("PATCH /:resource", () => {
      it("should not update resource", async () => {
        const user = { name: "bar" };
        await request(server)
          .patch("/user")
          .send(user)
          .expect({ id: 1, name: "bar", email: "foo@example.com" })
          .expect(200);
        expect(db.user).not.toMatchObject(user);
      });
    });

  });
});
