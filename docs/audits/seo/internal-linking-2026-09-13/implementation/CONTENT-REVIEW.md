# Exact stored-content changes

Prepared only; no production changes applied. Six records, handover rows 1–5, 8, 9 and 13. Other fields, locales, clinical prose, prices and attribution are preserved.

Manifest SHA-256: `2a8f969d9ef2f9fdfbc882fbbc27be6e3d62f41745836dc568e1cb455397b5c1`.

Private complete snapshot and inverse values: `backups/internal-linking-2026-09-13/manifest-v2.json`. This directory is Git-ignored.

## Rows 1 — cz/CS / diabetes-ticha-nemoc

Owner: `BlogPost.body`.

Before (context included):

```html
ost termínu.</p>
      <div class="cta-btns">
        <a href="https://www.myglobalhealth.online/cs/czech-republic/diabetologick%C3%A1-konzultace" class="btn-primary">Objednat konzultaci</a>
        <a href="https://www.myglobalhealth.online/cs/czech-republic/blog" class="btn-secondar
```

After:

```html
ost termínu.</p>
      <div class="cta-btns">
        <a href="https://www.myglobalhealth.online/czechia/cs/services/chronicka-onemocneni" class="btn-primary">Konzultace chronického onemocnění</a>
        <a href="https://www.myglobalhealth.online/cs/czech-republic/blog" class="btn-secondar
```

## Rows 2 — br/PT / diabetes-doenca-silenciosa

Owner: `BlogPost.body`.

Before (context included):

```html
mais.</p>
<div class="cta-btns">
<a class="btn-primary" href="https://www.myglobalhealth.online/br/clinica-geral">Agendar consulta</a>
<a class="btn-secondary" href="https://www.myglobalhealth.online/br/blog">Ler mais artigos</a>
```

After:

```html
mais.</p>
<div class="cta-btns">
<a class="btn-primary" href="https://www.myglobalhealth.online/brazil/pt/services/doencas-cronicas-online">Acompanhamento de doenças crônicas</a>
<a class="btn-secondary" href="https://www.myglobalhealth.online/br/blog">Ler mais artigos</a>
```

## Rows 5 — es/ES / baja-laboral-por-ansiedad-como-funciona

Owner: `BlogPost.body`.

Before (context included):

```html
 class="hero-actions"><a class="btn-lime" href="https://www.myglobalhealth.online/spain/es/services/justificante-medico-online">Consulta de salud mental</a><a class="btn-ghost" href="https://www.seg-social.es/">Incapaci
```

After:

```html
 class="hero-actions"><a class="btn-lime" href="https://www.myglobalhealth.online/spain/es/services/salud-mental-online">Consulta de salud mental</a><a class="btn-ghost" href="https://www.seg-social.es/">Incapaci
```

## Rows 8 — es/ES / como-bajar-la-tension-que-funciona-segun-la-evidencia

Owner: `BlogPost.body`.

Before (context included):

```html
e brazo validado y un protocolo de siete días. Una lectura suelta no sirve para decidir nada.</p><p>SEH-LELHA y ESC coinciden: siete días, dos o tres lecturas por la mañana antes de la medicación y ot
```

After:

```html
e brazo validado y un protocolo de siete días. Una lectura suelta no sirve para decidir nada.</p><p><a href="https://www.myglobalhealth.online/spain/es/tools/blood-pressure-chart">Consultar la tabla de tensión arterial</a>.</p><p>SEH-LELHA y ESC coinciden: siete días, dos o tres lecturas por la mañana antes de la medicación y ot
```

## Rows 13 — ie/EN / illness-benefit-ireland-how-to-claim

Owner: `BlogPost.body`.

Before (context included):

```html
ide does not quote them; every figure question here links to the Department's own page instead.</p><div class="hero-author"><div aria-hidden="true" class="hero-author-mark">GH</div><div><strong>Global
```

After:

```html
ide does not quote them; every figure question here links to the Department's own page instead.</p><p><a href="https://www.myglobalhealth.online/ireland/en/blog/illness-benefit-payment-ireland-rate-tax-timing">Illness Benefit payment rates and timing</a>.</p><div class="hero-author"><div aria-hidden="true" class="hero-author-mark">GH</div><div><strong>Global
```

## Rows 3, 4, 9 — pt/PT / hipertensao

Owner: `SeoLandingPageTranslation.bodyHtml`.

Before (context included):

```html
emos o plano; quando não está, ajustamos, coordenamos exames, ou encaminhamos para cardiologia.</p><h2>Marque a sua consulta</h2><p>Fale hoje com um médico registado na Ordem dos Médicos.</p><p><a href="/portugal/pt/services/hypertension-consultation">Consulta de Hipertensão</a></p><p><a href="/portugal/pt/services/family-and-general-medicine">Consulta de Medicina Geral e Familiar</a></p><p><a href="/portugal/pt/services/cardiology-consultation">Consulta de Cardiologia</a></p>
```

After:

```html
emos o plano; quando não está, ajustamos, coordenamos exames, ou encaminhamos para cardiologia.</p><p><a href="https://www.myglobalhealth.online/portugal/pt/tools/blood-pressure-chart">Tabela de tensão arterial</a>.</p><h2>Marque a sua consulta</h2><p>Fale hoje com um médico registado na Ordem dos Médicos.</p><p><a href="/portugal/pt/services/medicina-geral-e-familiar">Consulta de Medicina Geral e Familiar</a></p><p><a href="/portugal/pt/services/consulta-cardiologia">Consulta de Cardiologia</a></p>
```

## Apply and rollback

After production confirmation, run from the repo root. Both operations require the reviewed hash and compare current content before writing. Do not run the old manifest.

```powershell
node --env-file=backend/.env backend/scripts/patch-internal-links.mjs dry-run backups/internal-linking-2026-09-13/manifest-v2.json
node --env-file=backend/.env backend/scripts/patch-internal-links.mjs apply backups/internal-linking-2026-09-13/manifest-v2.json 2a8f969d9ef2f9fdfbc882fbbc27be6e3d62f41745836dc568e1cb455397b5c1
# Only if rollback is required after applying:
node --env-file=backend/.env backend/scripts/patch-internal-links.mjs rollback backups/internal-linking-2026-09-13/manifest-v2.json 2a8f969d9ef2f9fdfbc882fbbc27be6e3d62f41745836dc568e1cb455397b5c1
```

Save command receipts privately and publish redacted results. The public blog cache can take 300 seconds and the health-guide cache 60 seconds to expire. A database success is not live proof: fetch served anchors after cache refresh.
