'use strict';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_ADS_API_VERSION = 'v18';

async function refreshAccessToken() {
    const { GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN } = process.env;
    if (!GOOGLE_ADS_CLIENT_ID || !GOOGLE_ADS_CLIENT_SECRET || !GOOGLE_ADS_REFRESH_TOKEN) {
          throw new Error('[googleads] credenciais OAuth2 ausentes nas envs');
        }
    const body = new URLSearchParams({
          client_id: GOOGLE_ADS_CLIENT_ID,
          client_secret: GOOGLE_ADS_CLIENT_SECRET,
          refresh_token: GOOGLE_ADS_REFRESH_TOKEN,
          grant_type: 'refresh_token',
        });
    const res = await fetch(GOOGLE_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });
    const data = await res.json();
    if (!data.access_token) {
          throw new Error('[googleads] falha no refresh_token: ' + JSON.stringify(data));
        }
    return data.access_token;
  }

/**
 * Envia conversao offline para o Google Ads.
  * Requer nas ENVs: GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CUSTOMER_ID,
   *   GOOGLE_ADS_CONVERSION_ACTION_ID, GOOGLE_ADS_CLIENT_ID,
    *   GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN.
     * Opcional: GOOGLE_ADS_LOGIN_CUSTOMER_ID (MCC customer_id = 4323159431).
      *
       * @param {string} gclid
        * @param {Date|string} conversionDateTime
         * @param {number} [conversionValue=0]
          */
async function uploadOfflineConversion(gclid, conversionDateTime, conversionValue = 0) {
    const {
          GOOGLE_ADS_DEVELOPER_TOKEN,
          GOOGLE_ADS_CUSTOMER_ID,
          GOOGLE_ADS_LOGIN_CUSTOMER_ID,
          GOOGLE_ADS_CONVERSION_ACTION_ID,
        } = process.env;

    if (!GOOGLE_ADS_DEVELOPER_TOKEN || !GOOGLE_ADS_CUSTOMER_ID || !GOOGLE_ADS_CONVERSION_ACTION_ID) {
          console.warn('[googleads] envs ausentes — conversao offline ignorada');
          return { skipped: true, reason: 'env_missing' };
        }

    if (!gclid) {
          console.warn('[googleads] gclid ausente — lead veio de canal sem clique Ads');
          return { skipped: true, reason: 'gclid_missing' };
        }

    const accessToken = await refreshAccessToken();

    const dt = new Date(conversionDateTime);
    const pad = (n) => String(n).padStart(2, '0');
    const formatted =
      `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())} ` +
      `${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}:${pad(dt.getUTCSeconds())}+00:00`;

    const conversionAction = `customers/${GOOGLE_ADS_CUSTOMER_ID}/conversionActions/${GOOGLE_ADS_CONVERSION_ACTION_ID}`;

    const headers = {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
          'Content-Type': 'application/json',
        };
    if (GOOGLE_ADS_LOGIN_CUSTOMER_ID) {
          headers['login-customer-id'] = GOOGLE_ADS_LOGIN_CUSTOMER_ID;
        }

    const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${GOOGLE_ADS_CUSTOMER_ID}:uploadClickConversions`;

    const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
                  conversions: [{ gclid, conversionAction, conversionDateTime: formatted, conversionValue, currencyCode: 'BRL' }],
                  partialFailure: true,
                }),
        });

    const result = await res.json();

    if (!res.ok) {
          console.error('[googleads] erro HTTP', res.status, JSON.stringify(result));
          return { ok: false, httpStatus: res.status, error: result };
        }
    if (result.partialFailureError) {
          console.error('[googleads] partialFailureError', JSON.stringify(result.partialFailureError));
          return { ok: false, partialFailure: result.partialFailureError };
        }

    console.log('[googleads] conversao offline enviada — gclid:', gclid);
    return { ok: true };
  }

module.exports = { uploadOfflineConversion };
