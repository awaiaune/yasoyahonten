import {SQUARE_ERROR_CODES, SQUARE_ERROR_CATEGORIES} from './square-error-codes.js';
const CODES = new Set(SQUARE_ERROR_CODES), CATEGORIES = new Set(SQUARE_ERROR_CATEGORIES);
// Transient metadata never adds a fabricated field to Square's Payment schema.
const observations = new WeakMap();
const list = value => Array.isArray(value) ? value : [];
// Deduplication and official enums bound storage without discarding known codes.
const known = (values, allowed) => [...new Set(list(values).filter(v => allowed.has(v)))];
export function classifyPaymentFailure(codes) {
    if (codes.includes('CARD_DECLINED_VERIFICATION_REQUIRED')) return 'three_ds_required';
    if (codes.some(c => ['UNAUTHORIZED','FORBIDDEN','ACCESS_TOKEN_EXPIRED','ACCESS_TOKEN_REVOKED','INSUFFICIENT_SCOPES','INSUFFICIENT_PERMISSIONS','APPLICATION_DISABLED'].includes(c))) return 'authentication';
    if (codes.some(c => ['INVALID_LOCATION','LOCATION_MISMATCH','CARD_PROCESSING_NOT_ENABLED'].includes(c))) return 'location';
    if (codes.some(c => ['CARD_TOKEN_EXPIRED','CARD_TOKEN_USED','SOURCE_USED','SOURCE_EXPIRED'].includes(c))) return 'token_invalid';
    if (codes.some(c => ['CARD_EXPIRED','INVALID_CARD','INVALID_CARD_DATA','INVALID_EXPIRATION','INVALID_EXPIRATION_YEAR','INVALID_EXPIRATION_DATE','CVV_FAILURE','VERIFY_CVV_FAILURE','VERIFY_AVS_FAILURE','ADDRESS_VERIFICATION_FAILURE','PAN_FAILURE','EXPIRATION_FAILURE','INVALID_POSTAL_CODE'].includes(c))) return 'card_invalid';
    if (codes.some(c => ['CARD_DECLINED','GENERIC_DECLINE','CARD_DECLINED_CALL_ISSUER','INSUFFICIENT_FUNDS','CARD_NOT_SUPPORTED','TRANSACTION_LIMIT','PAYMENT_LIMIT_EXCEEDED'].includes(c))) return 'card_declined';
    if (codes.some(c => ['INTERNAL_SERVER_ERROR','SERVICE_UNAVAILABLE','TEMPORARY_ERROR','GATEWAY_TIMEOUT','BAD_GATEWAY','RATE_LIMITED','REQUEST_TIMEOUT'].includes(c))) return 'provider_unavailable';
    if (codes.some(c => ['BAD_REQUEST','INVALID_VALUE','MISSING_REQUIRED_PARAMETER','CURRENCY_MISMATCH','PAYMENT_AMOUNT_MISMATCH','INVALID_PHONE_NUMBER','INVALID_EMAIL_ADDRESS','IDEMPOTENCY_KEY_REUSED'].includes(c))) return 'request_invalid';
    return 'unknown';
}
export function paymentFailureEvidence(status, result, source = 'create') {
    // Official fields only. verification_results is EMV, not a 3DS result.
    const errors = [...list(result?.errors), ...list(result?.payment?.card_details?.errors)];
    const codes = known(errors.map(e => e?.code), CODES);
    const categories = known(errors.map(e => e?.category), CATEGORIES);
    const httpStatus = Number.isInteger(status) && status >= 100 && status <= 599 ? status : null;
    return {httpStatus, codes, categories, classification:classifyPaymentFailure(codes),
        unrecognizedCode:errors.some(e => typeof e?.code === 'string' && !CODES.has(e.code)),
        source:['create','lookup','payment','legacy'].includes(source) ? source : 'legacy',
        // Request rejection is never proof that no earlier charge exists.
        outcome:[400,401,402,403,422].includes(httpStatus) && codes.length && !codes.includes('IDEMPOTENCY_KEY_REUSED') ? 'rejected' : 'unknown'};
}
export function withPaymentDiagnostics(payment, status, response, source = 'create') {
    if (payment && typeof payment === 'object') observations.set(payment, paymentFailureEvidence(status, response, source));
    return payment;
}
export function diagnosticsForPayment(payment) {
    if (payment?.status === 'COMPLETED') return null;
    return observations.get(payment) || paymentFailureEvidence(null, {payment}, 'payment');
}
export function mergePaymentFailure(previous, current) {
    if (!previous) return current;
    // A lookup's HTTP 200 must not replace a recorded create-response HTTP 400.
    const first = previous.source === 'create' || !previous.source ? previous : current;
    const codes = known([...list(previous.codes), ...list(current.codes)], CODES);
    const categories = known([...list(previous.categories), ...list(current.categories)], CATEGORIES);
    return {...current, httpStatus:Number.isInteger(first.httpStatus) && first.httpStatus >= 100 && first.httpStatus <= 599 ? first.httpStatus : current.httpStatus,
        source:['create','lookup','payment','legacy'].includes(first.source) ? first.source : 'legacy',
        codes, categories, classification:classifyPaymentFailure(codes),
        unrecognizedCode:previous.unrecognizedCode === true || current.unrecognizedCode === true,
        outcome:previous.outcome === 'rejected' || current.outcome === 'rejected' ? 'rejected' : 'unknown'};
}
export class SquarePaymentFailure extends Error {
    constructor(status, result) {
        super('Square payment response requires reconciliation');
        this.evidence = paymentFailureEvidence(status, result);
    }
}
