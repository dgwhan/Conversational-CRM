/**
 * Đọc file bảng tính ngay trên trình duyệt (không tải file lên máy chủ):
 * - CSV (UTF-8, có/không BOM, phân cách bằng dấu phẩy, chấm phẩy hoặc tab)
 * - XLSX (sheet đầu tiên) – giải nén bằng DecompressionStream có sẵn của trình duyệt, không cần thư viện ngoài
 */

export interface SheetData {
  headers: string[];
  rows: string[][];
}

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export async function readSpreadsheet(file: File): Promise<SheetData> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('File vượt quá 5MB. Hãy chia nhỏ file trước khi nhập.');
  }
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx')) {
    return toSheet(await readXlsx(await file.arrayBuffer()));
  }
  if (name.endsWith('.xls')) {
    throw new Error('Định dạng .xls (Excel 97-2003) không được hỗ trợ. Hãy lưu lại thành .xlsx hoặc CSV UTF-8.');
  }
  return toSheet(parseCsvText(await file.text()));
}

function toSheet(matrix: string[][]): SheetData {
  const nonEmpty = matrix.filter((r) => r.some((c) => c.trim() !== ''));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };
  const width = Math.max(...nonEmpty.map((r) => r.length));
  const pad = (r: string[]) => Array.from({ length: width }, (_, i) => (r[i] ?? '').trim());
  const [header, ...rows] = nonEmpty.map(pad);
  return { headers: header.map((h, i) => h || `Cột ${i + 1}`), rows };
}

// ───────────────────────────── CSV ─────────────────────────────

export function parseCsvText(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '');
  const firstLine = src.slice(0, src.search(/\r?\n|$/));
  const delimiter = [',', ';', '\t']
    .map((d) => ({ d, n: firstLine.split(d).length }))
    .sort((a, b) => b.n - a.n)[0].d;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && field === '') inQuotes = true;
    else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// ───────────────────────────── XLSX ─────────────────────────────

async function readXlsx(buffer: ArrayBuffer): Promise<string[][]> {
  const zip = await unzip(buffer);
  const text = async (path: string) => {
    const entry = zip.get(path);
    return entry ? new TextDecoder('utf-8').decode(await entry()) : null;
  };

  // Xác định sheet đầu tiên qua workbook.xml + rels (tên file sheet không phải lúc nào cũng là sheet1.xml)
  let sheetPath = 'xl/worksheets/sheet1.xml';
  const workbook = await text('xl/workbook.xml');
  const rels = await text('xl/_rels/workbook.xml.rels');
  if (workbook && rels) {
    const wb = parseXml(workbook);
    const firstSheet = wb.getElementsByTagName('sheet')[0];
    const relId =
      firstSheet?.getAttribute('r:id') ??
      firstSheet?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    const rel = Array.from(parseXml(rels).getElementsByTagName('Relationship')).find(
      (r) => r.getAttribute('Id') === relId,
    );
    const target = rel?.getAttribute('Target');
    if (target) sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  }

  const sheetXml = await text(sheetPath);
  if (!sheetXml) throw new Error('Không tìm thấy trang tính trong file Excel.');

  const sharedXml = await text('xl/sharedStrings.xml');
  const shared = sharedXml
    ? Array.from(parseXml(sharedXml).getElementsByTagName('si')).map((si) =>
        Array.from(si.getElementsByTagName('t'))
          .map((t) => t.textContent ?? '')
          .join(''),
      )
    : [];

  const matrix: string[][] = [];
  for (const rowEl of Array.from(parseXml(sheetXml).getElementsByTagName('row'))) {
    const rowIndex = Number(rowEl.getAttribute('r') ?? matrix.length + 1) - 1;
    const row: string[] = [];
    let nextCol = 0;
    for (const c of Array.from(rowEl.getElementsByTagName('c'))) {
      const ref = c.getAttribute('r');
      const col = ref ? columnIndex(ref) : nextCol;
      nextCol = col + 1;
      const type = c.getAttribute('t');
      const v = c.getElementsByTagName('v')[0]?.textContent ?? '';
      let value: string;
      if (type === 's') value = shared[Number(v)] ?? '';
      else if (type === 'inlineStr') value = c.getElementsByTagName('t')[0]?.textContent ?? '';
      else if (type === 'b') value = v === '1' ? 'TRUE' : 'FALSE';
      else value = v;
      row[col] = value;
    }
    matrix[rowIndex] = Array.from(row, (x) => x ?? '');
  }
  return Array.from(matrix, (r) => r ?? []);
}

function columnIndex(ref: string): number {
  const letters = ref.replace(/\d+/g, '');
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseXml(xml: string): Document {
  return new DOMParser().parseFromString(xml, 'application/xml');
}

/** Đọc mục lục ZIP (central directory) và trả về hàm giải nén theo từng tệp bên trong. */
async function unzip(buffer: ArrayBuffer): Promise<Map<string, () => Promise<Uint8Array>>> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let eocd = -1;
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('File Excel bị hỏng hoặc không phải định dạng .xlsx.');

  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries = new Map<string, () => Promise<Uint8Array>>();
  const decoder = new TextDecoder('utf-8');

  for (let i = 0; i < count; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLen));

    entries.set(name, async () => {
      const localNameLen = view.getUint16(localOffset + 26, true);
      const localExtraLen = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + localNameLen + localExtraLen;
      const data = bytes.subarray(start, start + compressedSize);
      if (method === 0) return data;
      if (method !== 8) throw new Error('File Excel dùng kiểu nén không được hỗ trợ.');
      if (typeof DecompressionStream === 'undefined') {
        throw new Error('Trình duyệt không hỗ trợ đọc file Excel. Hãy lưu thành CSV UTF-8.');
      }
      const stream = new Response(data as BodyInit).body!.pipeThrough(new DecompressionStream('deflate-raw'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    });
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}
