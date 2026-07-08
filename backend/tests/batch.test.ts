import { describe, expect, it } from "vitest";
import { chunk } from "../src/utils/batch";

describe("chunk", () => {
  it("splits an array into chunks of the given size", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns a single chunk when size exceeds array length", () => {
    expect(chunk([1, 2], 10)).toEqual([[1, 2]]);
  });

  it("returns an empty array for empty input", () => {
    expect(chunk([], 5)).toEqual([]);
  });

  it("throws for a non-positive chunk size", () => {
    expect(() => chunk([1, 2], 0)).toThrow();
  });
});
