import { describe, expect, it } from "vitest";
import { sanitizePageBodyHtml } from "./sanitize-page-body";
import { scopeBlogHtml } from "./scope-blog-html";

describe("public body image delivery", () => {
  for (const render of [sanitizePageBodyHtml, scopeBlogHtml]) {
    it(`${render.name} optimizes public photos without changing dimensions or alt`, () => {
      const html = render('<img src="/images/stock/gp.jpg" width="2400" height="1600" alt="Doctor">');
      expect(html).toContain('/_next/image?');
      expect(html).toContain('srcset=');
      expect(html).toContain('loading="lazy"');
      expect(html).toContain('decoding="async"');
      expect(html).toContain('width="2400" height="1600" alt="Doctor"');
    });
    it(`${render.name} preserves private, external, vector and authored responsive sources`, () => {
      for (const src of ['/api/doctor/patients/id/image', 'https://example.com/photo.jpg', '/logos/mark.svg', '/images/animated.gif']) {
        const html = render(`<img src="${src}" onerror="alert(1)">`);
        expect(html).toContain(`src="${src}"`);
        expect(html).not.toContain('/_next/image');
        expect(html).not.toContain('onerror');
      }
      expect(render('<img src="/images/a.jpg" srcset="/images/a.jpg 1x, /images/b.jpg 2x" loading="eager">')).toContain('srcset="/images/a.jpg 1x, /images/b.jpg 2x"');
      expect(render('<img src="javascript:alert(1)">')).not.toContain('javascript:');
    });
  }
});
