import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  appendStreamMeta,
  createTeachingState,
  inferReplyMeta,
  isUnknownResponse,
  parseStreamMeta,
  updateTeachingState,
} from "./teaching-state";

describe("teaching-state", () => {
  it("tracks unknown responses", () => {
    let state = createTeachingState(0);
    state = updateTeachingState(state, "不知道", { figureIndex: 0 });
    assert.equal(state.unknownCount, 1);
    assert.ok(isUnknownResponse("不太懂"));
  });

  it("parses stream meta suffix", () => {
    const meta = { status: "hinting" as const, hint: "看 RP 间期" };
    const raw = appendStreamMeta("你好，请看图。", meta);
    const parsed = parseStreamMeta(raw);
    assert.equal(parsed.text, "你好，请看图。");
    assert.equal(parsed.meta?.status, "hinting");
  });

  it("infers confirming status", () => {
    const meta = inferReplyMeta("我认为是 AVNRT", "完全正确，分析得很完整。", createTeachingState(1));
    assert.equal(meta.status, "confirming");
  });
});
