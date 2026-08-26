type BlogShareInput = {
  articleUrl: string;
  title: string;
};

/** Social compose URLs that can be opened safely without loading an SDK. */
export function buildBlogShareLinks({ articleUrl, title }: BlogShareInput) {
  const encodedUrl = encodeURIComponent(articleUrl);
  const encodedTitle = encodeURIComponent(title);

  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${articleUrl}`)}`,
    x: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
  } as const;
}
