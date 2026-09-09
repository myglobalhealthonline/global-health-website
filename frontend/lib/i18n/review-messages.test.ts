import { describe, expect, it } from "vitest";
import { getCommonLocale } from "./get-common-locale";
import { getReviewMessages } from "./review-messages";
import { supportedLocaleCodes } from "./types";

describe("narrow review dictionary", () => {
  it.each(supportedLocaleCodes)("preserves canonical %s copy", (locale) => {
    const common = getCommonLocale(locale);
    expect(getReviewMessages(locale)).toEqual({
      patientReviews: common.a11y.patientReviews,
      doctifyReviews: common.a11y.doctifyReviews,
      body: common.doctify.body,
      blockedTitle: common.cookie.doctifyBlockedTitle,
      blockedBody: common.cookie.doctifyBlockedBody,
      load: common.cookie.doctifyLoad,
      settings: common.cookie.settingsLink,
    });
  });
});
