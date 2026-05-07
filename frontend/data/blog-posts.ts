export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  reviewer: string;
  updatedAt: string;
  body: string[];
};

/** Only real editorial posts belong here. Empty means public article routes return 404. */
export const blogPosts: BlogPost[] = [];
