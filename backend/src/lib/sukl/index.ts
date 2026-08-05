/**
 * SÚKL (Czech State Institute for Drug Control) integration — public surface.
 *
 * Scope today is the *foundation*: configuration gate, certificate loading and
 * validation, and a mutual-TLS transport. The ePoukaz payload layer is not here
 * because it cannot be written yet — operation names, namespaces and message
 * shapes come from SÚKL's WSDL/XSD, which has not been supplied. See
 * docs/sukl/INTERFACE_INVENTORY.md for the blocker list.
 *
 * Authentication is the workplace communication certificate over mTLS, which
 * SÚKL confirmed is sufficient. No doctor personal signing key is accepted or
 * stored anywhere in this module.
 */

export {
  isSuklConfigured,
  isSuklServiceConfigured,
  isAnySuklServiceConfigured,
  suklMissingConfig,
  suklWorkplaceCode,
  suklIco,
  suklEnvironment,
  suklServiceUrl,
  suklTimeoutMs,
  fingerprintSuffix,
  SUKL_SERVICES,
  SUKL_SERVICE_LABELS,
  SUKL_SERVICE_ENV_VARS,
} from "./config.js";
export type { SuklService } from "./config.js";

export { loadSuklPfx, readSuklPfx, resetSuklCertificateCache } from "./certificate.js";

export {
  inspectPkcs12,
  inspectSuklCertificate,
  resetSuklCertificateInfoCache,
  expiryWarnThreshold,
  SUKL_EXPIRY_WARN_DAYS,
} from "./certificate-validator.js";

export { suklPost, suklRequest, suklHandshake, suklHandshakeProbe } from "./transport.js";
export type {
  SuklResponse,
  SuklPostOptions,
  SuklRequestOptions,
  SuklHandshakeResult,
} from "./transport.js";

export {
  SuklError,
  SuklNotConfiguredError,
  isSuklError,
  suklErrorStatus,
  SUKL_ERROR_CODES,
} from "./errors.js";
export type { SuklErrorCode, SuklStage } from "./errors.js";

export type {
  SuklCertificateInfo,
  SuklCertificateSource,
  SuklHealthStatus,
  SuklServiceStatus,
} from "./certificate.types.js";
