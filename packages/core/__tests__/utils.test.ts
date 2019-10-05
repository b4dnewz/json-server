import { getPage } from "../src/utils";

describe("@json-server/core:utils", () => {

  describe("pagination", () => {
    it("should handle empty arrays", () => {
      const arr = [];
      expect(getPage(arr, 2, 5)).toEqual({
        items: [],
      });
    });
    it("should return items and correct page", () => {
      const arr = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "l"];
      expect(getPage(arr, 2, 2)).toEqual({
        items: ["c", "d"],
        current: 2,
        first: 1,
        last: 5,
        next: 3,
        prev: 1,
      });
    });
  });

});
