import assert from "node:assert/strict";
import { it } from "node:test";
import { isSensitiveMediaKey } from "./media-public.route.js";

it("keeps recruitment CV objects outside the public media surface", () => {
  assert.equal(isSensitiveMediaKey("recruitment/cv/6b1df95c-a31c-493a-b060-fdd47c46725a.pdf"), true);
  assert.equal(isSensitiveMediaKey("media/6b1df95c-a31c-493a-b060-fdd47c46725a-photo.png"), false);
});
