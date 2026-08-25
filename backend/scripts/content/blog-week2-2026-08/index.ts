import type { PostSet } from "../blog-seo-2026-08/types.js";
import { CZ_VYPOCET_NEMOCENSKE } from "./cz-vypocet-nemocenske.js";
import { ES_TENSION_ALTA_URGENCIAS } from "./es-tension-alta-urgencias.js";
import { IE_ILLNESS_BENEFIT_PAYMENT } from "./ie-illness-benefit-payment.js";
import { PT_ATESTADO_CARTA_CONDUCAO } from "./pt-atestado-carta-conducao.js";
import { PT_BAIXA_MEDICA_VALOR } from "./pt-baixa-medica-valor.js";
import { RO_SCADE_TENSIUNEA_RAPID } from "./ro-scade-tensiunea-rapid.js";

export const WEEK2_RESEARCH_POST_SETS: PostSet[] = [
  PT_BAIXA_MEDICA_VALOR,
  IE_ILLNESS_BENEFIT_PAYMENT,
  CZ_VYPOCET_NEMOCENSKE,
  PT_ATESTADO_CARTA_CONDUCAO,
  ES_TENSION_ALTA_URGENCIAS,
  RO_SCADE_TENSIUNEA_RAPID,
];

const APPROVED_LOCALES = new Map<string, readonly string[]>([
  ["pt-baixa-medica-valor", ["PT", "EN", "DE"]],
  ["ie-illness-benefit-payment", ["EN", "RO", "ES", "PT", "DE"]],
  ["cz-vypocet-nemocenske", ["CS", "EN", "DE"]],
  ["pt-atestado-carta-conducao", ["PT", "EN", "DE"]],
  ["es-tension-alta-urgencias", ["ES", "EN", "DE"]],
  ["ro-scade-tensiunea-rapid", ["RO", "EN"]],
]);

export const WEEK2_POST_SETS: PostSet[] = WEEK2_RESEARCH_POST_SETS.map((set) => ({
  ...set,
  posts: set.posts.filter((post) => APPROVED_LOCALES.get(set.key)?.includes(post.locale)),
}));

export const WEEK2_PRIMARY_POST_SETS: PostSet[] = WEEK2_POST_SETS.map((set) => ({
  ...set,
  posts: set.posts.slice(0, 1),
}));
