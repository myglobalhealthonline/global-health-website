import { BR_ATESTADO_MEDICO } from "./br-atestado-medico.js";
import { BR_PEDIDO_EXAMES } from "./br-pedido-exames.js";
import { CZ_LEKAR_ONLINE } from "./cz-lekar-online.js";
import { CZ_NESCHOPENKA } from "./cz-neschopenka.js";
import { ES_BAJA_ANSIEDAD } from "./es-baja-ansiedad.js";
import { ES_DERMATOLOGO_ONLINE } from "./es-dermatologo-online.js";
import { IE_BLOOD_TESTS } from "./ie-blood-tests.js";
import { IE_ILLNESS_BENEFIT } from "./ie-illness-benefit.js";
import { PT_AUTODECLARACAO } from "./pt-autodeclaracao.js";
import { PT_CONSULTA_VIAJANTE } from "./pt-consulta-viajante.js";
import { RO_BOLI_CRONICE } from "./ro-boli-cronice.js";
import { RO_SCRISOARE_MEDICALA } from "./ro-scrisoare-medicala.js";
import type { PostSet } from "./types.js";

/** Every article in the August 2026 SEO batch, in market order. */
export const POST_SETS: PostSet[] = [
  IE_ILLNESS_BENEFIT,
  IE_BLOOD_TESTS,
  CZ_NESCHOPENKA,
  CZ_LEKAR_ONLINE,
  PT_AUTODECLARACAO,
  PT_CONSULTA_VIAJANTE,
  ES_BAJA_ANSIEDAD,
  ES_DERMATOLOGO_ONLINE,
  RO_SCRISOARE_MEDICALA,
  RO_BOLI_CRONICE,
  BR_ATESTADO_MEDICO,
  BR_PEDIDO_EXAMES,
];
