-- Adds the "footer" key to Country.enabledFeatures so the
-- /admin/country-features (Pages) controller shows a Footer toggle and
-- the sidebar honours per-country footer visibility.
--
-- Backfill: every existing Country row that doesn't already list "footer"
-- gets it appended — that way upgrading doesn't silently hide the footer
-- editor for markets that were created before this feature shipped.

UPDATE "Country"
   SET "enabledFeatures" = array_append("enabledFeatures", 'footer')
 WHERE NOT 'footer' = ANY("enabledFeatures");

-- Refresh the column default so newly-created countries pick up "footer"
-- as part of the defaults set.
ALTER TABLE "Country"
  ALTER COLUMN "enabledFeatures"
  SET DEFAULT ARRAY[
    'country-home',
    'country-content',
    'pages',
    'footer',
    'services',
    'general-consultations',
    'specialist-consultations',
    'online-prescriptions',
    'health-tests',
    'appointments'
  ]::TEXT[];
