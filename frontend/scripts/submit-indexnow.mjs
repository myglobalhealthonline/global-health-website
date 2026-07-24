// Standalone IndexNow submitter — fetches the live sitemap and pings
// api.indexnow.org in batches of 500. Node stdlib only (no deps).
//
// Usage: node frontend/scripts/submit-indexnow.mjs

const SITE = "https://www.myglobalhealth.online";
const KEY = "2b7f7c129e4df9753043da11ba9e32ff";
const KEY_LOCATION = `${SITE}/${KEY}.txt`;
const HOST = new URL(SITE).host;
const BATCH_SIZE = 500;

async function main() {
  const res = await fetch(`${SITE}/sitemap.xml`);
  if (!res.ok) {
    throw new Error(`Failed to fetch sitemap.xml: ${res.status}`);
  }
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1].trim());

  if (urls.length === 0) {
    console.log("No <loc> URLs found in sitemap.xml — nothing to submit.");
    return;
  }

  console.log(`Found ${urls.length} URLs. Submitting in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const resp = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key: KEY,
        keyLocation: KEY_LOCATION,
        urlList: batch,
      }),
    });
    console.log(
      `Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} URLs): ${resp.status} ${resp.statusText}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
