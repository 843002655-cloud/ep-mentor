import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isAllowedAnalyticsEvent,
  sanitizeAnalyticsMetadata,
  sanitizeAnalyticsPath,
} from "./analytics-events";

describe("analytics-events", () => {
  it("allows known event types only", () => {
    assert.equal(isAllowedAnalyticsEvent("page_view"), true);
    assert.equal(isAllowedAnalyticsEvent("case_complete"), true);
    assert.equal(isAllowedAnalyticsEvent("spam_event"), false);
    assert.equal(isAllowedAnalyticsEvent(null), false);
  });

  it("sanitizes paths", () => {
    assert.equal(sanitizeAnalyticsPath("/cases"), "/cases");
    assert.equal(sanitizeAnalyticsPath("evil"), "/");
    assert.equal(sanitizeAnalyticsPath("/x".repeat(600)).length, 500);
  });

  it("sanitizes metadata", () => {
    assert.deepEqual(sanitizeAnalyticsMetadata({ case_id: "abc", nested: { x: 1 } }), {
      case_id: "abc",
    });
  });
});
