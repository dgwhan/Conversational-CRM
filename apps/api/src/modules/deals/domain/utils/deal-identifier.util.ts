export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Kiểm tra chuỗi có đúng định dạng UUID hay không
 */
export function isValidUuid(id: string | null | undefined): boolean {
    if (!id) return false;
    return UUID_REGEX.test(id);
}

/**
 * Làm sạch tiền tố (cust-, cand-) và xác thực UUID hợp lệ
 */
export function sanitizeEntityId(rawId: string | null | undefined): string | undefined {
    if (!rawId) return undefined;
    const stripped = rawId.replace(/^(cust|cand)-/, '');
    return isValidUuid(stripped) ? stripped : undefined;
}

