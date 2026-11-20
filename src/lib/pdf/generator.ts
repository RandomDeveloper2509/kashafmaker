import {
  PDFDocument,
  PDFImage,
  rgb,
  StandardFonts,
  PDFFont,
  PDFPage,
  pushGraphicsState,
  popGraphicsState,
  rectangle,
  clip,
  endPath,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs/promises";
import path from "path";
import {
  TemplateFieldConfig,
  TemplateField,
  KashafDataContext,
  PassengerTableConfig,
  resolveFieldValue,
} from "./types";
import { isNbisStyleTemplate } from "./nbis-template";
import { readFile } from "../storage";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

const fontBytesCache = new Map<string, Buffer>();

async function readFontBytes(fontFileName: string): Promise<Buffer | null> {
  if (fontBytesCache.has(fontFileName)) {
    return fontBytesCache.get(fontFileName)!;
  }
  const candidates = [
    path.join(process.cwd(), "public", "fonts", fontFileName),
    path.join(UPLOAD_DIR, "fonts", fontFileName),
    path.join(process.cwd(), "uploads", "fonts", fontFileName),
    path.join(process.cwd(), "assets", fontFileName),
  ];
  for (const fontPath of candidates) {
    try {
      const bytes = await fs.readFile(fontPath);
      fontBytesCache.set(fontFileName, bytes);
      return bytes;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function loadFont(
  pdfDoc: PDFDocument,
  fontFamily: string,
  bold: boolean,
  forArabic = false
): Promise<PDFFont> {
  const fontMap: Record<string, string> = {
    Helvetica: bold ? "Helvetica-Bold" : "Helvetica",
    Arial: bold ? "Helvetica-Bold" : "Helvetica",
    Times: bold ? "Times-Bold" : "Times-Roman",
    Courier: bold ? "Courier-Bold" : "Courier",
    Calibri: bold ? "calibrib.ttf" : "calibri.ttf",
    NotoSansArabic: bold ? "NotoSansArabic-Bold.ttf" : "NotoSansArabic-Regular.ttf",
    Tajawal: bold ? "Tajawal-Bold.ttf" : "Tajawal-Regular.ttf",
  };

  if (forArabic) {
    const fontFile = bold ? "NotoSansArabic-Bold.ttf" : "NotoSansArabic-Regular.ttf";
    const fontBytes = await readFontBytes(fontFile);
    if (fontBytes) {
      try {
        return await pdfDoc.embedFont(fontBytes, { subset: true });
      } catch {
        /* fall through */
      }
    }
  }

  const mapped = fontMap[fontFamily] || fontMap["Helvetica"];

  if (mapped.endsWith(".ttf")) {
    const fontBytes = await readFontBytes(mapped);
    if (fontBytes) {
      try {
        return await pdfDoc.embedFont(fontBytes, { subset: true });
      } catch {
        /* fall through */
      }
    }
    return pdfDoc.embedFont(bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica);
  }

  return pdfDoc.embedFont(mapped as StandardFonts);
}

function getTextX(
  field: TemplateField,
  text: string,
  font: PDFFont,
  fontSize: number
): number {
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const align = field.direction === "rtl" && field.align === "left" ? "right" : field.align;

  switch (align) {
    case "center":
      return field.x + (field.width - textWidth) / 2;
    case "right":
      return field.x + field.width - textWidth;
    default:
      return field.x;
  }
}

function wrapTextToLines(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  maxLines: number
): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  if (!maxWidth || maxWidth <= 0 || font.widthOfTextAtSize(normalized, fontSize) <= maxWidth) {
    return [normalized];
  }

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  const flush = () => {
    if (current) {
      lines.push(current);
      current = "";
    }
  };

  const takeChunk = (word: string) => {
    if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
      current = word;
      return;
    }
    let chunk = "";
    for (const ch of word) {
      const next = chunk + ch;
      if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
        chunk = next;
      } else {
        if (chunk) lines.push(chunk);
        chunk = ch;
        if (lines.length >= maxLines) {
          current = "";
          return;
        }
      }
    }
    current = chunk;
  };

  // Special handling for 2-line wrapping: split words evenly across 2 lines
  if (maxLines === 2 && words.length >= 3) {
    let bestSplit = Math.ceil(words.length / 2);
    if (words.length === 4) {
      bestSplit = 2; // Exact 2 words up, 2 words down
    }
    const firstLine = words.slice(0, bestSplit).join(" ");
    const secondLine = words.slice(bestSplit).join(" ");

    return [firstLine, secondLine];
  }

  for (const word of words) {
    if (lines.length >= maxLines) break;
    const trial = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(trial, fontSize) <= maxWidth) {
      current = trial;
      continue;
    }
    flush();
    if (lines.length >= maxLines) break;
    takeChunk(word);
  }
  flush();

  if (lines.length > maxLines) return lines.slice(0, maxLines);
  return lines.length ? lines : [normalized];
}

function wrappedIncludesAll(original: string, lines: string[]): boolean {
  return lines.join(" ").replace(/\s+/g, "") === original.replace(/\s+/g, "");
}

function wrapToFit(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  maxLines: number
): { lines: string[]; size: number } {
  if (maxLines <= 1) {
    const fitted = fitTextToWidth(text, font, fontSize, maxWidth);
    return { lines: [fitted.text], size: fitted.size };
  }

  let size = fontSize;
  let lines = wrapTextToLines(text, font, size, maxWidth, maxLines);
  while (size > 7 && !wrappedIncludesAll(text, lines)) {
    size -= 0.25;
    lines = wrapTextToLines(text, font, size, maxWidth, maxLines);
  }
  return { lines: lines.length ? lines : [text], size };
}

function fitTextToWidth(text: string, font: PDFFont, fontSize: number, maxWidth: number, minSize = 8): { text: string; size: number } {
  if (!maxWidth || maxWidth <= 0) return { text, size: fontSize };
  let size = fontSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.2;
  }
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return { text, size };
  const wrapped = wrapTextToLines(text, font, size, maxWidth, 1);
  return { text: wrapped[0] || text, size };
}

function flattenTemplateWidgets(pdfDoc: PDFDocument) {
  try {
    const form = pdfDoc.getForm();
    for (const field of form.getFields()) {
      try {
        const maybeText = field as { setText?: (v: string) => void };
        maybeText.setText?.("");
      } catch {
        /* ignore non-text widgets */
      }
    }
    form.flatten();
  } catch {
    /* template has no AcroForm */
  }
}

function coverWithBackground(
  page: PDFPage,
  image: PDFImage,
  clipRect: { x: number; y: number; width: number; height: number }
) {
  if (clipRect.width <= 1 || clipRect.height <= 1) return;
  const { width, height } = page.getSize();
  page.pushOperators(
    pushGraphicsState(),
    rectangle(clipRect.x, clipRect.y, clipRect.width, clipRect.height),
    clip(),
    endPath()
  );
  page.drawImage(image, { x: 0, y: 0, width, height });
  page.pushOperators(popGraphicsState());
}

let cachedLetterheadBytes: Buffer | null = null;

async function loadLetterhead(pdfDoc: PDFDocument): Promise<PDFImage | null> {
  if (!cachedLetterheadBytes) {
    const candidates = [
      path.join(process.cwd(), "public", "templates", "nbis-letterhead.png"),
      path.join(process.cwd(), "assets", "nbis-letterhead.png"),
      path.join(UPLOAD_DIR, "templates", "nbis-letterhead.png"),
      path.join(process.cwd(), "uploads", "templates", "nbis-letterhead.png"),
    ];
    for (const file of candidates) {
      try {
        cachedLetterheadBytes = await fs.readFile(file);
        break;
      } catch {
        /* try next */
      }
    }
  }
  if (cachedLetterheadBytes) {
    try {
      return await pdfDoc.embedPng(cachedLetterheadBytes);
    } catch {
      /* fall through */
    }
  }
  return null;
}

function hideUnusedPassengerRows(
  page: PDFPage,
  config: PassengerTableConfig,
  usedRows: number,
  letterhead: PDFImage | null
) {
  if (!config.hideUnusedRows || !config.unusedMask || !config.rowBottoms?.length || !letterhead) return;
  const maxRows = Math.min(config.maxRows, config.rowBottoms.length);
  const filled = Math.min(usedRows, maxRows);
  const { x, width, minY, firstRowTop } = config.unusedMask;
  const top = filled <= 0 ? firstRowTop ?? minY : config.rowBottoms[filled - 1];
  coverWithBackground(page, letterhead, {
    x,
    y: minY,
    width,
    height: top - minY - 0.6,
  });
}

function drawSpacedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  fontSize: number,
  letterSpacing: number,
  textColor: [number, number, number] = [0, 0, 0]
) {
  const color = rgb(textColor[0], textColor[1], textColor[2]);
  if (!letterSpacing) {
    page.drawText(text, { x, y, size: fontSize, font, color });
    return;
  }
  let cursor = x;
  for (const char of text) {
    page.drawText(char, { x: cursor, y, size: fontSize, font, color });
    cursor += font.widthOfTextAtSize(char, fontSize) + letterSpacing;
  }
}

async function drawTextField(
  page: PDFPage,
  field: TemplateField,
  text: string,
  pdfDoc: PDFDocument
) {
  if (!text) return;

  const arabic = field.direction === "rtl" || containsArabic(text);
  const font = await loadFont(pdfDoc, field.fontFamily, field.bold, arabic);
  const maxLines = field.wrapLines && field.wrapLines > 1 ? field.wrapLines : 1;
  const wrapped = wrapToFit(text, font, field.fontSize, field.width, maxLines);
  const fontSize = wrapped.size;
  const pageHeight = page.getHeight();
  const y = field.pdfBaseline ?? pageHeight - field.y - fontSize;
  const lineGap = fontSize * 1.12;
  const color = field.color || (field.page === 2 ? [0.28, 0.28, 0.28] : [0, 0, 0]);

  const drawLines = (drawFont: PDFFont, lines: string[], size: number) => {
    lines.forEach((line, index) => {
      const x = getTextX({ ...field, width: field.width }, line, drawFont, size);
      drawSpacedText(page, line, x, y - index * lineGap, drawFont, size, field.letterSpacing || 0, color);
    });
  };

  try {
    drawLines(font, wrapped.lines, fontSize);
  } catch {
    const fallback = await loadFont(pdfDoc, "Helvetica", field.bold, false);
    const safe = wrapToFit(text.replace(/[^\x20-\x7E]/g, "?"), fallback, field.fontSize, field.width, maxLines);
    drawLines(fallback, safe.lines, safe.size);
  }
}

async function drawImageField(
  page: PDFPage,
  field: TemplateField,
  imagePath: string,
  pdfDoc: PDFDocument
) {
  try {
    const fullPath = path.join(UPLOAD_DIR, imagePath);
    const imageBytes = await fs.readFile(fullPath);
    const ext = path.extname(imagePath).toLowerCase();

    let image;
    if (ext === ".png") {
      image = await pdfDoc.embedPng(imageBytes);
    } else {
      image = await pdfDoc.embedJpg(imageBytes);
    }

    const pageHeight = page.getHeight();
    page.drawImage(image, {
      x: field.x,
      y: pageHeight - field.y - field.height,
      width: field.width,
      height: field.height,
    });
  } catch {
    // Skip if image cannot be loaded
  }
}

async function ensureOverflowPages(
  pdfDoc: PDFDocument,
  config: PassengerTableConfig,
  passengerCount: number
) {
  const extra = Math.max(0, Math.ceil(passengerCount / config.maxRows) - 1);
  if (extra === 0) return;

  const sourceIndex = Math.max(0, config.page - 1);
  for (let i = 0; i < extra; i++) {
    const [copied] = await pdfDoc.copyPages(pdfDoc, [sourceIndex]);
    pdfDoc.addPage(copied);
  }
}

async function drawPassengerTable(
  pdfDoc: PDFDocument,
  config: PassengerTableConfig,
  passengers: KashafDataContext["passengers"]
) {
  const pages = pdfDoc.getPages();
  const needsArabic = passengers.some(
    (p) =>
      containsArabic(p.passenger_name || "") ||
      containsArabic(p.nationality || "") ||
      containsArabic(p.passport_number || "")
  );
  const font = await loadFont(pdfDoc, config.fontFamily, false, needsArabic || config.direction === "rtl");
  const fontSize = config.fontSize;
  const sourceIndex = Math.max(0, config.page - 1);
  const widths = config.columnWidths || {};
  let pageIndex = sourceIndex;
  let rowOnPage = 0;

  for (let i = 0; i < passengers.length; i++) {
    if (rowOnPage >= config.maxRows) {
      pageIndex++;
      rowOnPage = 0;
    }

    const page = pages[pageIndex];
    if (!page) break;

    const pageHeight = page.getHeight();
    const y = config.rowBaselines?.[rowOnPage] ?? pageHeight - config.startY - rowOnPage * config.rowHeight - fontSize;
    const passenger = passengers[i];

    const cells: Array<[number | undefined, string | undefined, number | undefined, number]> = [
      [config.columns.name, passenger.passenger_name, widths.name, 2],
      [config.columns.passport, passenger.passport_number, widths.passport, 1],
      [config.columns.nationality, passenger.nationality, widths.nationality, 1],
    ];

    const textColorRgb = config.textColor || [0.28, 0.28, 0.28];
    const textColor = rgb(textColorRgb[0], textColorRgb[1], textColorRgb[2]);

    for (const [colX, value, maxWidth, maxLines] of cells) {
      if (colX === undefined || !value) continue;
      const wrapped = wrapToFit(value, font, fontSize, maxWidth ?? 0, maxLines);
      const lineGap = Math.min(wrapped.size * 1.05, 9.2);
      const boxWidth = maxWidth ?? 0;
      try {
        wrapped.lines.forEach((line, index) => {
          const textW = font.widthOfTextAtSize(line, wrapped.size);
          const centeredX = boxWidth > 0 ? colX + (boxWidth - textW) / 2 : colX;
          page.drawText(line, {
            x: centeredX,
            y: y - index * lineGap,
            size: wrapped.size,
            font,
            color: textColor,
          });
        });
      } catch {
        const safe = wrapToFit(value.replace(/[^\x20-\x7E]/g, "?"), font, fontSize, maxWidth ?? 0, maxLines);
        safe.lines.forEach((line, index) => {
          const textW = font.widthOfTextAtSize(line, safe.size);
          const centeredX = boxWidth > 0 ? colX + (boxWidth - textW) / 2 : colX;
          page.drawText(line, {
            x: centeredX,
            y: y - index * lineGap,
            size: safe.size,
            font,
            color: textColor,
          });
        });
      }
    }

    rowOnPage++;
  }
}

async function drawPage1Contract(
  page: PDFPage,
  context: KashafDataContext,
  pdfDoc: PDFDocument
) {
  const regularFont = await loadFont(pdfDoc, "NotoSansArabic", false, true);
  const boldFont = await loadFont(pdfDoc, "NotoSansArabic", true, true);

  const color = rgb(0, 0, 0);

  const rightMargin = 566;
  const pageWidth = page.getWidth();

  // Reverse Arabic-Indic digit runs so that RTL text flow displays them
  // in standard visual order (most significant digit on left).
  // Brackets are left untouched so they wrap numbers correctly: (٣٩)
  const fixArabicNumbers = (text: string) =>
    text.replace(/[\u0660-\u0669]+/g, (match) => match.split("").reverse().join(""));

  const drawRTL = (text: string, y: number, fontSize = 12, font = regularFont) => {
    const fixed = fixArabicNumbers(text);
    const w = font.widthOfTextAtSize(fixed, fontSize);
    page.drawText(fixed, { x: rightMargin - w, y, size: fontSize, font, color });
  };

  const drawCenter = (text: string, y: number, fontSize = 20, font = boldFont) => {
    const fixed = fixArabicNumbers(text);
    const w = font.widthOfTextAtSize(fixed, fontSize);
    page.drawText(fixed, { x: (pageWidth - w) / 2, y, size: fontSize, font, color });
  };

  const drawLabelValue = (
    label: string,
    value: string,
    y: number,
    startX: number = rightMargin,
    maxValWidth: number = 280,
    fontSize = 12
  ) => {
    const fixedLabel = fixArabicNumbers(label);
    const labelW = regularFont.widthOfTextAtSize(fixedLabel, fontSize);
    const labelX = startX - labelW;
    page.drawText(fixedLabel, { x: labelX, y, size: fontSize, font: regularFont, color });

    if (value) {
      const fixedVal = fixArabicNumbers(value);
      let valSize = fontSize;
      let valW = regularFont.widthOfTextAtSize(fixedVal, valSize);
      while (valSize > 8.5 && valW > maxValWidth) {
        valSize -= 0.5;
        valW = regularFont.widthOfTextAtSize(fixedVal, valSize);
      }
      const valX = labelX - 8 - valW;
      page.drawText(fixedVal, { x: valX, y, size: valSize, font: regularFont, color });
    }
  };

  // 1. Title
  drawCenter("عقد نقل على الطرق البرية", 675, 20, boldFont);

  // 2. Date
  const dateStr = context.ride?.date || "";
  drawLabelValue("التاريخ :", dateStr, 640);

  // 3. Paragraph 1 (5 lines)
  const p1Lines = [
    "تم ابرام هذا العقد بين المتعاقدين بناء على المادة (٣٩) التاسعة و الثالثون من اللائحة المنظمة لنشاط النقل",
    "المتخصص و تأجير و توجيه الحافلات و بناء على الفقرة (١) من المادة (٣٩) و التي تنص على ان يجب على",
    "الناقل ابرام عقد نقل مع الأطراف المحددين في المادة (٤٠) قبل تنفيذ عمليات النقل على الطرق البرية و بما لا",
    "يخالف احكام هذه اللا ئحة ووفقا الألية التي تحددها هيئة النقل و بناء على ما سبق تم ابرام عقد النقل بين",
    "الأطراف الأتيه",
  ];
  let curY = 604;
  for (const line of p1Lines) {
    drawRTL(line, curY);
    curY -= 18;
  }

  // 4. First Party & Second Party
  curY -= 18;
  drawRTL("الطرف ألاول : مؤسسة نور بصيرتي للنقليات / رقم س.ت: ٧٠٣٧٨٥٦٦٦٨", curY);
  curY -= 18;

  const secondParty =
    context.third_party ||
    (context.passengers?.[0]?.passenger_name
      ? context.passengers[0].passenger_name +
        (context.passengers.length > 1 ? ` and ${context.passengers.length - 1} Members` : "")
      : "");
  drawLabelValue("الطرف الثاني :", secondParty, curY, rightMargin, 350);

  // 5. Paragraph 2 (2 lines)
  curY -= 26;
  const p2Lines = [
    "اتفق الطرفان على أن ينفذ الطرف الأول عملية النقل للطرف الثاني مع مرافقيه و ذويهم من الموقع المحدد",
    "مسبقا مع الطرف الثاني و توصيلهم الى الجهه المحدده بالعقد.",
  ];
  for (const line of p2Lines) {
    drawRTL(line, curY);
    curY -= 18;
  }

  // 6. Trip line: النقل من : {pickup} وصولا الى : {destination}
  curY -= 22;
  const pickup = context.ride?.pickup || "";
  const destination = context.ride?.destination || "";
  drawLabelValue("النقل من :", pickup, curY, rightMargin, 150);
  drawLabelValue("وصولا الى :", destination, curY, 320, 150);

  // 7. Paragraph 3 (Cancellation terms - 2 lines)
  curY -= 26;
  const p3Lines = [
    "في حالة الغاء التعاقد الى سبب شخصى او أسباب أخرى تتعلق في الحجوزات او الأنظمة تكون سياسة الإلغاء و",
    "الاستبدال.",
  ];
  for (const line of p3Lines) {
    drawRTL(line, curY);
    curY -= 18;
  }

  // 8. Paragraph 4 (Ministry of Commerce rules - 2 lines)
  curY -= 22;
  const p4Lines = [
    "حسب نظام وزارة التجارة السعودي في حالة الحجز و تم الإلغاء قبل موعد الرحله بأكثر من ٢٤ ساعه يتم استرداد",
    "المبلغ كامل.",
  ];
  for (const line of p4Lines) {
    drawRTL(line, curY);
    curY -= 18;
  }

  // 9. Paragraph 5 (Online booking terms - 3 lines)
  curY -= 22;
  const p5Lines = [
    "و في حالة طلب الطرف الثاني الحجز من خلال الموقع الالكتروني للمؤسسه يعتبر هذا الحجز و موافقته على",
    "الشروط والحكام بالموقع الالكتروني هو موافقة على هذا العقد لتنفيذ عملية النقل المتفق عليها مع الطرف",
    "الاول بواسطة حافلات المؤسسة المرخصه و المتوافقه مع الاشتراطات المقررة من هيئة النقل.",
  ];
  for (const line of p5Lines) {
    drawRTL(line, curY);
    curY -= 18;
  }
}

export async function generateKashafPdf(
  templatePath: string,
  fieldConfig: TemplateFieldConfig,
  context: KashafDataContext
): Promise<Uint8Array> {
  const templateBytes = await readFile(templatePath);

  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  pdfDoc.registerFontkit(fontkit);
  flattenTemplateWidgets(pdfDoc);

  if (fieldConfig.passengerTable && context.passengers.length > 0) {
    if (fieldConfig.passengerTable.allowOverflow !== false) {
      await ensureOverflowPages(pdfDoc, fieldConfig.passengerTable, context.passengers.length);
    }
  }

  const pages = pdfDoc.getPages();
  const letterhead = await loadLetterhead(pdfDoc);

  if (letterhead && fieldConfig.coverRects?.length) {
    for (const rect of fieldConfig.coverRects) {
      const page = pages[rect.page - 1];
      if (page) coverWithBackground(page, letterhead, rect);
    }
  }

  const tablePage = fieldConfig.passengerTable
    ? pages[Math.max(0, fieldConfig.passengerTable.page - 1)]
    : undefined;
  if (tablePage && fieldConfig.passengerTable) {
    hideUnusedPassengerRows(tablePage, fieldConfig.passengerTable, context.passengers.length, letterhead);
  }

  if (pages.length >= 1 && isNbisStyleTemplate(pages.length, pages[0].getWidth(), pages[0].getHeight())) {
    await drawPage1Contract(pages[0], context, pdfDoc);
  }

  for (const field of fieldConfig.fields) {
    if (field.page === 1 && isNbisStyleTemplate(pages.length, pages[0].getWidth(), pages[0].getHeight())) {
      continue;
    }
    const pageIndex = field.page - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const value = resolveFieldValue(field.field, context);

    if (field.type === "image" && value) {
      await drawImageField(page, field, value, pdfDoc);
    } else if (field.type === "text" || !field.type) {
      await drawTextField(page, field, value, pdfDoc);
    }
  }

  if (fieldConfig.passengerTable && context.passengers.length > 0) {
    await drawPassengerTable(pdfDoc, fieldConfig.passengerTable, context.passengers);
  }

  // Draw Kashaf Document ID below passenger table on page 2 (bottom right, directly below last row)
  const docNumber = context.ride?.ride_number; // Note: Kashaf document number or generated ID
  if (docNumber && pages.length >= 2) {
    const p2 = pages[1];
    try {
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const arabicFont = await loadFont(pdfDoc, "NotoSansArabic", false, true);
      const fontSize = 10;
      const textColor = rgb(0.28, 0.28, 0.28); // Same color and weight as page 1 & other fields

      // Dynamically position Y right below the last passenger row
      const passengerCount = context.passengers.length;
      const tableConfig = fieldConfig.passengerTable;
      let targetY = 128;
      if (tableConfig?.rowBottoms?.length && passengerCount > 0) {
        const lastRowIndex = Math.min(passengerCount - 1, tableConfig.rowBottoms.length - 1);
        const lastRowBottom = tableConfig.rowBottoms[lastRowIndex];
        targetY = lastRowBottom - 18; // Directly below the last row
      }

      // English ID string: "SXA - 726420261113001685"
      const idStr = String(docNumber).trim();
      const idWidth = helveticaFont.widthOfTextAtSize(idStr, fontSize);

      // Clean Arabic label: "رقم الكشف:"
      const arabicLabel = "رقم الكشف:";
      const labelWidth = arabicFont.widthOfTextAtSize(arabicLabel, fontSize);

      // Total block aligned to right margin of passenger table (x ~ 574)
      const rightMargin = 574;
      const totalWidth = idWidth + 6 + labelWidth;
      const startX = rightMargin - totalWidth;

      // Draw English ID on the left
      p2.drawText(idStr, {
        x: startX,
        y: targetY,
        size: fontSize,
        font: helveticaFont,
        color: textColor,
      });

      // Draw standard "رقم الكشف:" on the right
      p2.drawText(arabicLabel, {
        x: startX + idWidth + 6,
        y: targetY,
        size: fontSize,
        font: arabicFont,
        color: textColor,
      });
    } catch {
      // Fallback
    }
  }

  return pdfDoc.save();
}

export async function getPdfPageCount(templatePath: string): Promise<number> {
  const templateBytes = await readFile(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  return pdfDoc.getPageCount();
}

export function getSampleContext(): KashafDataContext {
  return {
    company: {
      company_name: "Nour Basirti Transport",
      company_name_ar: "مؤسسة نور بصيرتي للنقليات",
      commercial_registration: "7037856668",
      vat_number: "300012345600003",
      company_phone: "+966 55 126 2206",
      company_email: "info@nourbaserti.com",
      company_address: "King Fahd Road, Riyadh",
      company_city: "Riyadh",
      company_country: "Saudi Arabia",
    },
    ride: {
      ride_number: "SXA-7266",
      date: "15 November 2026",
      time: "08:00",
      pickup: "JEDDAH CITY",
      destination: "MAKKAH HOTEL",
      trip_type: "Umrah Transfer",
      notes: "Sample ride for preview",
      datetime: "15 November 2026",
    },
    driver: {
      driver_name: "Rehmat Ullah",
      driver_name_ar: "رحمت الله",
      iqama_number: "2123456789",
      driver_phone: "+966 55 987 6543",
      nationality: "Pakistan",
      license_number: "DL-123456",
    },
    vehicle: {
      vehicle_type: "Van",
      vehicle_make: "Hyundai",
      vehicle_model: "Staria",
      plate_number: "SXA-7266",
      vehicle_id: "VH-001",
      vehicle_color: "White",
      vehicle_capacity: "11",
      vehicle_display: "Hyundai Staria",
    },
    passengers: [
      {
        passenger_name: "ISLOM KARIMOV",
        passport_number: "CE1159477",
        nationality: "Uzbekistan",
        gender: "Male",
        visa_type: "Umrah",
      },
      {
        passenger_name: "Mansoor Ahmed",
        passport_number: "AN8785242",
        nationality: "Pakistan",
        gender: "Male",
        visa_type: "Umrah",
      },
      {
        passenger_name: "Raja Shahid Nazir Janjua",
        passport_number: "AK0711234",
        nationality: "Pakistan",
        gender: "Male",
        visa_type: "Umrah",
      },
      {
        passenger_name: "Asma Mansoor",
        passport_number: "AK0711235",
        nationality: "Pakistan",
        gender: "Female",
        visa_type: "Umrah",
      },
      {
        passenger_name: "Fatima Bibi",
        passport_number: "AK0711236",
        nationality: "Pakistan",
        gender: "Female",
        visa_type: "Umrah",
      },
      {
        passenger_name: "Zainab Bibi",
        passport_number: "AK0711237",
        nationality: "Pakistan",
        gender: "Female",
        visa_type: "Umrah",
      },
      {
        passenger_name: "Ali Ahmed",
        passport_number: "AK0711238",
        nationality: "Pakistan",
        gender: "Male",
        visa_type: "Umrah",
      },
    ],
    third_party: "ISLOM KARIMOV and 6 Members",
  };
}
