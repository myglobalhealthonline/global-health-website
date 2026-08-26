import assert from "node:assert/strict";
import test from "node:test";

import {
  IRELAND_DOCTOR_PROFILE_KEYWORD_VERSION,
  irelandDoctorProfileBlockedRecords,
  irelandDoctorProfileKeywordMap,
  irelandDoctorProfileSeoUpdates,
} from "./ireland-doctor-profile-keywords.js";

const eligibleSlugs = [
  "dr-abdelrahman-mustafa",
  "dr-ahmed-maklad",
  "dr-emmanuel-dabup",
  "dr-fahad-farooq",
  "dr-fatima-ali",
  "dr-mariam-faiz",
  "dr-mohamed-fadzly-bin-mohamed",
  "dr-mohammed-omar",
  "dr-muhammad-mataro",
  "dr-muhammad-tahir-arain",
  "dr-muhammad-usman-yoosuf",
  "dr-raafat-ibrahim",
  "dr-raza-khan",
  "dr-saadia-irfan",
  "dr-tiago-miguel-figueira",
  "dr-yousif-mohamed",
  "khoiamul-islam",
  "maristela-ferro-nepomuceno",
  "priscila-figueiredo",
  "roney-carli",
  "silvia-alexandre-fernandes",
].sort();

test("targets exactly the 21 publishable active Ireland doctor profiles", () => {
  assert.match(IRELAND_DOCTOR_PROFILE_KEYWORD_VERSION, /^IE-DOCTOR-PROFILE-KEYWORDS-/);
  assert.deepEqual(irelandDoctorProfileKeywordMap.map(({ slug }) => slug).sort(), eligibleSlugs);
  assert.equal(new Set(irelandDoctorProfileKeywordMap.map(({ slug }) => slug)).size, 21);
});

test("keeps the thin active profile blocked instead of manufacturing clinical copy", () => {
  assert.deepEqual(irelandDoctorProfileBlockedRecords, [
    {
      slug: "dr-arooj-iqbal-lodhi",
      reason: "No substantive biography in the production Ireland roster",
    },
  ]);
  assert.ok(!irelandDoctorProfileKeywordMap.some(({ slug }) => slug === "dr-arooj-iqbal-lodhi"));
});

test("provides one name-first metadata update in every Ireland locale", () => {
  assert.equal(irelandDoctorProfileSeoUpdates.length, 21 * 6);
  for (const slug of eligibleSlugs) {
    const updates = irelandDoctorProfileSeoUpdates.filter((update) => update.slug === slug);
    assert.deepEqual(updates.map(({ locale }) => locale).sort(), ["CS", "DE", "EN", "ES", "PT", "RO"]);
    for (const update of updates) {
      assert.ok(update.seoTitle.startsWith(update.displayName), `${update.locale}/${slug} must be name-first`);
      assert.ok(update.seoTitle.length <= 80, `${update.locale}/${slug} title is too long`);
      assert.ok(update.seoDescription.length >= 100, `${update.locale}/${slug} description is too short`);
      assert.ok(update.seoDescription.length <= 180, `${update.locale}/${slug} description is too long`);
      assert.ok(update.seoKeywords.length >= 3, `${update.locale}/${slug} needs a focused keyword set`);
    }
  }
});

test("preserves verified professional scope and avoids generic page cannibalization", () => {
  const all = JSON.stringify(irelandDoctorProfileSeoUpdates);
  assert.doesNotMatch(all, /best doctor|best specialist|guaranteed|same-day|no referral/i);
  assert.doesNotMatch(all, /CORU[- ]registered|registered dietitian/i);

  const fahad = irelandDoctorProfileKeywordMap.find(({ slug }) => slug === "dr-fahad-farooq");
  const fatima = irelandDoctorProfileKeywordMap.find(({ slug }) => slug === "dr-fatima-ali");
  const priscila = irelandDoctorProfileKeywordMap.find(({ slug }) => slug === "priscila-figueiredo");
  const silvia = irelandDoctorProfileKeywordMap.find(({ slug }) => slug === "silvia-alexandre-fernandes");
  assert.equal(fahad?.verifiedRole, "Neurology Registrar");
  assert.equal(fatima?.verifiedRole, "Medical Oncology Registrar");
  assert.equal(priscila?.verifiedRole, "Rehabilitation & Wellness Consultant");
  assert.equal(silvia?.verifiedRole, "Nutritional Therapist");

  for (const entry of irelandDoctorProfileKeywordMap) {
    assert.equal(entry.primaryKeyword, entry.displayName.toLowerCase());
    assert.ok(entry.evidence.length > 0);
    assert.ok(entry.excludedKeywords.includes("online doctors Ireland"));
    assert.ok(entry.excludedKeywords.includes("online specialist consultation Ireland"));
  }
});
