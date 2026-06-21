import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ECG_ACADEMY_PRODUCT,
  EP_MENTOR_PRODUCT,
  isEcgAcademyCase,
  isEpMentorCase,
  withEpMentorProduct,
} from "./case-product";

describe("case-product", () => {
  it("identifies ecg-academy cases", () => {
    assert.equal(isEcgAcademyCase({ product: ECG_ACADEMY_PRODUCT }), true);
    assert.equal(isEpMentorCase({ product: ECG_ACADEMY_PRODUCT }), false);
  });

  it("treats missing product as EP Mentor", () => {
    assert.equal(isEpMentorCase({}), true);
    assert.equal(isEpMentorCase(null), true);
    assert.equal(isEcgAcademyCase({}), false);
  });

  it("tags new cases with ep-mentor product", () => {
    const result = withEpMentorProduct({ title: "test" });
    assert.equal(result.product, EP_MENTOR_PRODUCT);
    assert.equal(result.title, "test");
  });
});
