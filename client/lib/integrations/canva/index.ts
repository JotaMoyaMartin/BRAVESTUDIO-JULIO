/**
 * Cliente centralizado Canva REST (provider único — no dispersar llamadas
 * por el código). Uso:
 *   import { canvaAuth, canva, canvaTokens } from '@/lib/integrations/canva'
 */

export * from './types'
export {
  CANVA_AUTH_URL,
  CANVA_TOKEN_URL,
  CANVA_REVOKE_URL,
  CANVA_SCOPES,
  buildAuthorizationUrl,
  exchangeCode,
  refreshAccessToken,
  generatePkcePair,
  randomBase64Url,
  sha256Base64Url,
  getCanvaEnv,
  isCanvaConfigured,
  parseDesignRef,
} from './auth'
export { canvaRequest, CANVA_API_BASE } from './client'
export { pollCanvaJob } from './poll'
export { getDesign, getDesignDataset } from './designs'
export { createAutofillFromDesign, awaitAutofillDesign } from './autofill'
export type { AutofillDataValue } from './autofill'
export { createPngExport, awaitExportUrls, fetchExportPng } from './exports'
export { ensureDesignExportsBucket, DESIGN_EXPORTS_BUCKET } from './storage'
export { createUrlAssetUpload, awaitAssetId } from './assets'
export { runDesignGeneration } from './generate'
export type { GenerationInput, GenerationPhotoInput } from './generate'
export {
  getConnectionRow,
  saveNewConnection,
  ensureFreshToken,
  disconnectConnection,
  markConnectionError,
} from './tokens'