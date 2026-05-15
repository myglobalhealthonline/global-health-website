// Constants and types shared between the admin layout (server) and the
// CountryPicker (client). Keep this file free of "use client" so Next.js
// doesn't wrap exports in a client-reference stub when the layout imports it.

export const COUNTRY_PREF_COOKIE = "gh_admin_country";

export type CountryPickerOption = {
  id: string;
  slug: string;
  code: string;
  name: string;
};
