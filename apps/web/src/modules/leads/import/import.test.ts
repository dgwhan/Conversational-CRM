// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { parseCsvText, readSpreadsheet } from './spreadsheetReader.js';
import { autoMapColumns, toCsv } from './importFields.js';

/** Dựng một file ZIP tối giản (nén deflate) để mô phỏng .xlsx */
async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Response(bytes as BodyInit).body!.pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function buildZip(files: Record<string, string>): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = enc.encode(name);
    const data = await deflateRaw(enc.encode(content));
    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(8, 8, true);
    lv.setUint32(18, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(10, 8, true);
    cv.setUint32(20, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);

    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const centralSize = centrals.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, centrals.length, true);
  ev.setUint16(10, centrals.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const out = new Uint8Array(offset + centralSize + 22);
  let pos = 0;
  for (const part of [...locals, ...centrals, eocd]) {
    out.set(part, pos);
    pos += part.length;
  }
  return out;
}

function fileFrom(bytes: Uint8Array | string, name: string): File {
  const blob = new Blob([bytes as BlobPart]);
  // jsdom chưa có File.arrayBuffer/text ở mọi phiên bản → bổ sung từ Blob của Node
  return Object.assign(blob, {
    name,
    lastModified: 0,
    webkitRelativePath: '',
  }) as unknown as File;
}

describe('parseCsvText', () => {
  it('đọc ngoặc kép, xuống dòng trong ô, BOM và dấu chấm phẩy', () => {
    expect(parseCsvText(String.fromCharCode(0xfeff) + 'Họ tên;SĐT\r\n"Nguyễn ""An""";0912\n"Dòng\nhai";')).toEqual([
      ['Họ tên', 'SĐT'],
      ['Nguyễn "An"', '0912'],
      ['Dòng\nhai', ''],
    ]);
  });
});

describe('readSpreadsheet (xlsx)', () => {
  it('đọc sheet đầu tiên, sharedStrings, ô trống và số', async () => {
    const zip = await buildZip({
      'xl/workbook.xml':
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="DS" sheetId="1" r:id="rId1"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels':
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/data.xml"/></Relationships>',
      'xl/sharedStrings.xml':
        '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Họ và tên</t></si><si><t>SĐT</t></si><si><t>Ngày sinh</t></si><si><r><t>Trần </t></r><r><t>Bình</t></r></si></sst>',
      'xl/worksheets/data.xml':
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
        '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>' +
        '<row r="2"><c r="A2" t="s"><v>3</v></c><c r="C2"><v>39696</v></c></row>' +
        '</sheetData></worksheet>',
    });

    const sheet = await readSpreadsheet(fileFrom(zip, 'ds.xlsx'));
    expect(sheet.headers).toEqual(['Họ và tên', 'SĐT', 'Ngày sinh']);
    expect(sheet.rows).toEqual([['Trần Bình', '', '39696']]);
  });

  it('từ chối .xls cũ', async () => {
    await expect(readSpreadsheet(fileFrom('x', 'cu.xls'))).rejects.toThrow(/xlsx/);
  });
});

describe('autoMapColumns', () => {
  it('ghép tiêu đề tiếng Việt có/không dấu với trường CRM', () => {
    expect(
      autoMapColumns(['STT', 'Họ và tên', 'Số điện thoại', 'E-mail', 'Trường THPT', 'Ngành quan tâm', 'Ghi chú khác']),
    ).toEqual({
      0: '',
      1: 'fullName',
      2: 'phone',
      3: 'email',
      4: 'school',
      5: 'interestCourses',
      6: 'notes',
    });
  });
});

describe('toCsv', () => {
  it('chặn công thức Excel và thoát ký tự đặc biệt', () => {
    expect(toCsv([['=HYPERLINK("x")', 'a,b', 'thường']])).toBe(String.fromCharCode(0xfeff) + '"\'=HYPERLINK(""x"")","a,b",thường');
  });
});
