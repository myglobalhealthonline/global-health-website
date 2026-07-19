import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";
import { renderBlogIndexPage } from "@/lib/content/blog-index-page";

export const metadata: Metadata = {
  title: `Health Blog | ${SITE_NAME}`,
  description:
    "Guides, explainers, and health education from the Global Health medical team covering telemedicine, online consultations, lab tests, and more.",
};

export default async function BlogIndexPage() {
  return renderBlogIndexPage({});
}
