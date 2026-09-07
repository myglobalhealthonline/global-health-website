# ZalozitPredpis — the request payload

Source: `HTML_dokumentace/documentationCuer.html` from
`eRecept_prioritni_webove_sluzby_netCORE_v2_dokumentace_pro_vyvojare.zip`,
supplied by SÚKL 2026-09-05. This is the schema the WSDL only points at: the
`xsd:import` names an internal host, but the same definitions are in that HTML.
Nothing here is inferred.

## `ZalozeniPredpisuDotaz`

```
Doklad     zalozeni_predpisu_erp_doklad_dotaz_type   REQUIRED
Zprava     zprava_dotaz_type                         REQUIRED
Signature  xmldsig#SignatureType                     (required in practice — see SIGNING_SPEC.md)
```

## `Doklad` — zalozeni_predpisu_erp_doklad_dotaz_type

| Field | Type | Req | Notes |
|---|---|---|---|
| `DatumVystaveni` | date | **yes** | Issue date |
| `PlatnostDo` | date | **yes** | Validity end, set at creation |
| `Akutni` | boolean | | Acute / urgent care |
| `Rodina` | boolean | | For family use / ad usum proprium |
| `Preshranicni` | boolean | | Cross-border — **not used** |
| `Opakovani` | long | | Total dispensings for a repeat prescription |
| `Pacient` | ulozeni_pacient_type | **yes** | |
| `Predepisujici` | ulozeni_predepisujici_type | **yes** | |
| `Doporucujici` | ulozeni_doporucujici_type | | Referring doctor |
| `PLP` | ulozeni_predepsany_lp_erp_type[] | **yes** | The prescribed items |
| `Pozn` | string ≤1000 | | |
| `UpozornitLekare` | upozornit_lekare | | Accepts a note back from the dispensing pharmacy |
| `Stav` | stav_elektronickeho_receptu | **yes** | `PREDEPSANY` on creation |
| `DruhPojisteni` | druh_pojisteni | | |

## `Pacient`

| Field | Type | Req | Notes |
|---|---|---|---|
| `Totoznost` | totoznost_type | **yes** | Name, birth date, address, ID document, ROB |
| `CP` | `[0-9]{9,10}` | | Insurance number, no slash |
| `ZP` | `[0-9]{3}` | | Insurer code |
| `Telefon` | ≤20 | | |
| `Email` | 3–256 | | |
| `Notifikace` | EMAIL \| SMS | | Notification CÚeR sends the patient |
| `Veznice` | ≤200 | | Prison, where applicable |
| `Hmotnost` | decimal ≥0.5 | | Weight |
| `Pohlavi` | M \| F | | |
| `KontaktniAdresa` | ≤1024 | | |

## `Predepisujici` — every required field here is a prerequisite

| Field | Type | Req | Notes |
|---|---|---|---|
| `Lekar` | string ≤36 | **yes** | The doctor's login, verified against External Identities — the UUID from their SÚKL registration |
| `ICP` | `[0-9]{8}` | **yes** | Workplace identification number. SÚKL: anything works in test (Q6) |
| `PZS` | `[0-9]{11}` | **yes** | Provider code from External Identities — **`00150928369`**, our workplace code |
| `Telefon` | ≤20 | **yes** | Easy to miss: the doctor's phone is mandatory |
| `ICZ` | `[0-9]{8}` | | Facility number |
| `Email` | 3–256 | | |
| `Odbornost` | `[0-9][0-9A-Z][0-9]` | | VZP speciality code |
| `KrajKod` | ≤5 | | Region — required when prescribing a highly addictive substance |

## `PLP` — each prescribed item

| Field | Type | Req | Notes |
|---|---|---|---|
| `Mnozstvi` | int 1–999 | **yes** | |
| `Navod` | string ≤80 | **yes** | Da signa, without the "D.S." prefix |
| `Uhrada` | uhrada | **yes** | Requested insurance reimbursement |
| `Diagnoza` | ≤5 | | Reason for the prescription |
| `PridruzenaDiagnoza` | ≤5 | | |
| `HVLPReg` | hvlp_type | | Registered medicine, per the SÚKL code list |
| `HVLPNereg` | hvlp_type | | Unregistered medicine |
| `IPLP` | iplp_predpis_type | | Compounded preparation |
| `INN` | inn_predpis_type | | International non-proprietary name |
| `Nezamenovat` | boolean | | Do not substitute |
| `Prekroceni` | boolean | | Dose exceeded ("exclamation mark") |

Exactly one of `HVLPReg` / `HVLPNereg` / `IPLP` / `INN` identifies the product.

## `Stav` — stav_elektronickeho_receptu

`PREDEPSANY` is the value to send on creation; the rest are pharmacy-side or
unused.

| Value | Meaning |
|---|---|
| `PREDEPSANY` | Prescribed — the default after creation, dispensable |
| `PRIPRAVOVANY` | Pharmacy is preparing it; also used to block dispensing |
| `CASTECNE_VYDANY` | Partially dispensed, more may follow |
| `PLNE_VYDANY` | Fully dispensed |
| `NEDOKONCENY_VYDEJ` | Not dispensed, with a recorded reason |
| `KE_SCHVALENI`, `ZAMITNUTY`, `UZAVRENY` | Not used |

## What this leaves open

- **`Lekar`** is verified against External Identities, so it must be the
  doctor's own SÚKL login. `Login` on the Common service returns it.
- **`Telefon`** is mandatory for the prescriber and we do not currently store a
  phone against `SuklDoctorIdentity`.
- The product code lists (`hvlp_type` and the rest) are separate; a prescription
  cannot name a medicine without one.
