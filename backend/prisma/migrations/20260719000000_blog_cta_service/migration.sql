-- Optional link from a blog post to a Service, driving the public article
-- page's bottom "Book a consultation" CTA target.
ALTER TABLE "BlogPost" ADD COLUMN "ctaServiceId" TEXT;

ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_ctaServiceId_fkey" FOREIGN KEY ("ctaServiceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
