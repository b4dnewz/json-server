import * as _ from "lodash";
import * as lodashId from "lodash-id";
import * as mixins from "../src/mixins";

describe("@json-server/core:mixins", () => {
  let db;

  beforeAll(() => {
    _.mixin(lodashId);
    _.mixin(mixins);
  });

  beforeEach(() => {
    db = {
      posts: [{ id: 1, comment: 1 }],
      comments: [
        { id: 1, postId: 1 },
        // Comments below references a post that doesn't exist
        { id: 2, postId: 2 },
        { id: 3, postId: 2 },
      ],
      photos: [{ id: "1" }, { id: "2" }],
    };
  });

  describe("getRemovable", () => {
    it("should return removable documents", () => {
      const expected = [
        { name: "comments", id: 2 },
        { name: "comments", id: 3 },
      ];

      expect(_.getRemovable(db, { foreignKeySuffix: "Id" })).toEqual(expected);
    });
  });

  describe("createId", () => {
    it("should return 1 when collection is empty", () => {
      expect(_.createId([])).toBe(1);
    });

    it("should return a new id", () => {
      expect(_.createId(db.comments)).toBe(4);
    });

    it("should return a new uuid", () => {
      expect(_.createId(db.photos)).not.toBe(3);
    });
  });

  describe("deepQuery", () => {
    it("should search into arrays", () => {
      expect(_.deepQuery([
        "one",
        "two",
        "three",
      ], "three")).toBeTruthy();
    });

    it("should search into objects", () => {
      expect(_.deepQuery({
        one: "one",
        two: "two",
        three: "three",
      }, "three")).toBeTruthy();
    });

    it("should search deep to nested fields", () => {
      expect(_.deepQuery({
        foo: "bar",
        baz: [{
          one: "one",
          two: {
            three: ["three"],
          },
        }],
      }, "three")).toBeTruthy();
    });
  });
});
