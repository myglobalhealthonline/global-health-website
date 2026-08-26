import { describe, expect, it } from "vitest";
import { buildBlogShareLinks } from "./blog-share-links";

describe("buildBlogShareLinks", () => {
  const articleUrl =
    "https://www.myglobalhealth.online/ireland/en/blog/hand-foot-and-mouth-disease-signs-and-treatment";
  const title = "Hand, foot and mouth disease: signs and treatment";

  it("builds encoded share destinations for supported social networks", () => {
    const links = buildBlogShareLinks({ articleUrl, title });

    expect(links.facebook).toBe(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`,
    );
    expect(links.whatsapp).toBe(
      `https://wa.me/?text=${encodeURIComponent(`${title} ${articleUrl}`)}`,
    );
    expect(links.x).toBe(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(articleUrl)}`,
    );
    expect(links.linkedin).toBe(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`,
    );
  });

  it("does not invent an Instagram compose URL", () => {
    const links = buildBlogShareLinks({ articleUrl, title });

    expect(links).not.toHaveProperty("instagram");
  });
});
