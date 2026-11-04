// Persist only bounded, public error identifiers, never provider details/card data.
const CODES = new Set(['CARD_DECLINED','GENERIC_DECLINE','CVV_FAILURE','VERIFY_CVV_FAILURE',
    'ADDRESS_VERIFICATION_FAILURE','CARD_EXPIRED','INVALID_EXPIRATION','INVALID_CARD',
    'CARD_NOT_SUPPORTED','PAN_FAILURE','CARD_TOKEN_EXPIRED','CARD_TOKEN_USED','SOURCE_USED',
    'BAD_REQUEST','INVALID_VALUE','UNAUTHORIZED','FORBIDDEN','ACCESS_TOKEN_EXPIRED',
    'INSUFFICIENT_PERMISSIONS','AUTHENTICATION_REQUIRED','INVALID_LOCATION',
    'IDEMPOTENCY_KEY_REUSED','INTERNAL_SERVER_ERROR','SERVICE_UNAVAILABLE']);
export class SquarePaymentFailure extends Error {
    constructor(status, result) {
        super('Square payment response requires reconciliation');
        const codes = [...new Set((Array.isArray(result?.errors) ? result.errors : [])
            .map(e => e?.code).filter(code => CODES.has(code)))].slice(0, 4);
        // A rejection response explains the failed request, but does not prove
        // that no earlier request using this payment key was accepted.
        this.evidence = {httpStatus: status, codes,
            outcome: [400,401,402,403,422].includes(status) && codes.length &&
                !codes.includes('IDEMPOTENCY_KEY_REUSED') ? 'rejected' : 'unknown'};
    }
}
