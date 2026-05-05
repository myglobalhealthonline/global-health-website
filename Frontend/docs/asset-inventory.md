# Asset Inventory

Initial audit table for migrating assets from Wix references into local `public/` assets.
Do not hotlink Wix CDN assets in production templates.

| Asset Group | Source Page/Route | Current Local Path | Status | Owner | Notes |
| --- | --- | --- | --- | --- | --- |
| Logos | Global header/footer | `public/logos/` | needs audit | unassigned | Collect all light/dark variants |
| Icons | Global UI + trust badges | `public/icons/` | needs audit | unassigned | Replace remote icon URLs |
| Hero images | Homepage and country hubs | `public/images/hero/` | needs audit | unassigned | Confirm responsive crops |
| Team photos | Country team pages | `public/images/team/` | needs audit | unassigned | Verify licensing and consent |
| Service images | Consultation/service pages | `public/images/services/` | needs audit | unassigned | Map by route slug |
| Blog covers | Blog listing/posts | `public/images/blog/` | needs audit | unassigned | Ensure alt text inventory |
| Legal illustrations | Legal/policy pages | `public/images/legal/` | needs audit | unassigned | Optional decorative assets |
| Social previews | OG/Twitter cards | `public/social/` | needs audit | unassigned | Per-route social metadata |
| Country flags | Selector and navigation | `public/icons/flags/` | needs audit | unassigned | Ensure consistent icon set |
| Misc marketing assets | Campaign pages | `public/images/marketing/` | needs audit | unassigned | Track campaign ownership |

