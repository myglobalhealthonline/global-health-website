/**
 * SÚKL (Czech State Institute for Drug Control) integration — public surface.
 *
 * Covers the configuration gate, certificate handling, a mutual-TLS transport,
 * the diagnostic operations (AppPing, GetAppInfo, Login, WSDL), XML-DSig
 * signing, and the eRecept payload layer — ZalozitPredpis and ZrusitPredpis.
 *
 * The module to build against is CUER (medicines), not CUEP (medical devices):
 * the CUEP schema carries only orthopaedic, hearing and optical vouchers.
 *
 * Authentication has two shapes and they differ in what they demand:
 *
 *   - Workplace certificate over mTLS plus HTTP Basic. Business operations then
 *     require the prescriber's qualified XML signature.
 *   - NIA / Identita občana. The doctor signs in interactively, the resulting
 *     bearer token covers the day, and NO message signature is required —
 *     except AppPingZEP, which always needs one.
 *
 * See docs/sukl/NIA_AUTH.md, SIGNING_SPEC.md and PRESCRIPTION_PAYLOAD.md.
 */

export {
  isSuklConfigured,
  isSuklServiceConfigured,
  isAnySuklServiceConfigured,
  isSuklCallable,
  suklMissingCallConfig,
  suklUzivatel,
  suklInterfaceVersion,
  suklSwKlienta,
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

export {
  suklPost,
  suklGet,
  suklRequest,
  suklHandshake,
  suklHandshakeProbe,
} from "./transport.js";
export { summariseWsdl, addressToPath } from "./wsdl.js";
export {
  buildSoapEnvelope,
  escapeXml,
  el,
  extractFault,
  extractElementText,
  extractAllElementText,
} from "./envelope.js";
export type { SoapFault } from "./envelope.js";
export {
  suklAppPing,
  buildAppPingRequest,
  interpretAppPingResponse,
} from "./app-ping.js";
export type { SuklAppPingResult } from "./app-ping.js";
export {
  suklGetAppInfo,
  buildAppInfoRequest,
  interpretAppInfoResponse,
} from "./app-info.js";
export type { SuklAppInfoResult } from "./app-info.js";
export type { WsdlSummary } from "./wsdl.js";
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
export * from "./login.js";
export * from "./signing.js";
export * from "./app-ping-zep.js";
export * from "./zalozit-predpis.js";
export * from "./zrusit-predpis.js";
export * from "./nia.js";
