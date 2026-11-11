/**
 * Chuẩn hóa dấu, ký tự lặp và khoảng trắng mà không áp đặt từ vựng theo ngành.
 */

/**
 * Loại bỏ dấu tiếng Việt (Unaccent)
 */
export function stripVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}

/**
 * Rút gọn các ký tự lặp liên tiếp (>= 3 ký tự liên tiếp -> 1 ký tự)
 * Ví dụ: "họcccc" -> "học", "dạaaaa" -> "dạ", "quaaaa" -> "qua"
 * Ngoại lệ: Giữ nguyên từ viết tắt đặc thù như "cccd"
 */
export function deduplicateRepeatedChars(str: string): string {
  if (!str) return '';
  return str.replace(/\b([a-z0-9_]+)\b/gi, (word) => {
    if (word.toLowerCase() === 'cccd') return word;
    return word.replace(/(.)\1{2,}/gi, '$1');
  });
}

/**
 * Hàm chuẩn hóa văn bản chính normalize()
 * Thực hiện:
 * 1. Chữ thường & chuẩn hóa Unicode NFC
 * 2. Bỏ dấu tiếng Việt (giúp xử lý triệt để ký tự lặp nguyên âm có dấu như "dạaaaa" -> "daaaaa" -> "da")
 * 3. Rút gọn ký tự lặp (VD: "hocccc phi" -> "hoc phi")
 * 4. Gộp khoảng trắng liên tiếp và cắt viền
 */
export function normalize(rawText: string | null | undefined): string {
  if (!rawText || typeof rawText !== 'string') return '';

  // 1. Chữ thường & Unicode NFC
  let text = rawText.toLowerCase().normalize('NFC').trim();

  // 2. Bỏ dấu tiếng Việt trước để đồng nhất nguyên âm kéo dài teencode (dạaaaa -> daaaaa)
  text = stripVietnameseAccents(text);

  // 3. Rút gọn ký tự lặp
  text = deduplicateRepeatedChars(text);

  // 4. Gộp khoảng trắng thừa
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

export function containsNormalizedPhrase(normalizedText: string, normalizedPhrase: string): boolean {
  if (!normalizedText || !normalizedPhrase) return false;
  const isWordCharacter = (character: string | undefined) =>
    character !== undefined && /[\p{L}\p{N}_]/u.test(character);
  let index = normalizedText.indexOf(normalizedPhrase);

  while (index !== -1) {
    const before = index > 0 ? normalizedText[index - 1] : undefined;
    const afterIndex = index + normalizedPhrase.length;
    const after = afterIndex < normalizedText.length ? normalizedText[afterIndex] : undefined;
    if (!isWordCharacter(before) && !isWordCharacter(after)) return true;
    index = normalizedText.indexOf(normalizedPhrase, index + 1);
  }

  return false;
}
