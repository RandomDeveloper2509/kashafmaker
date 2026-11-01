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
    NotoSansArabic: "NotoSansArabic-Regular.ttf",
  };

  if (forArabic) {
    const fontBytes = await readFontBytes("NotoSansArabic-Regular.ttf");
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

function fitTextToWidth(text: string, font: PDFFont, fontSize: number, maxWidth: number, minSize = Math.max(9.5, fontSize - 0.5)): { text: string; size: number } {
  if (!maxWidth || maxWidth <= 0) return { text, size: fontSize };
  let size = fontSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.2;
  }
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return { text, size };
  let fitted = text;
  while (fitted.length > 1 && font.widthOfTextAtSize(`${fitted}...`, size) > maxWidth) {
    fitted = fitted.slice(0, -1);
  }
  return { text: `${fitted}...`, size };
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
  letterSpacing: number
) {
  if (!letterSpacing) {
    page.drawText(text, { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
    return;
  }
  let cursor = x;
  for (const char of text) {
    page.drawText(char, { x: cursor, y, size: fontSize, font, color: rgb(0, 0, 0) });
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
  const fitted = fitTextToWidth(text, font, field.fontSize, field.width);
  const fontSize = fitted.size;
  const pageHeight = page.getHeight();
  const y = field.pdfBaseline ?? pageHeight - field.y - fontSize;
  const x = getTextX({ ...field, width: field.width }, fitted.text, font, fontSize);

  try {
    drawSpacedText(page, fitted.text, x, y, font, fontSize, field.letterSpacing || 0);
  } catch {
    const fallback = await loadFont(pdfDoc, "Helvetica", field.bold, false);
    const safe = fitTextToWidth(text.replace(/[^\x20-\x7E]/g, "?"), fallback, field.fontSize, field.width);
    page.drawText(safe.text, {
      x: getTextX(field, safe.text, fallback, safe.size),
      y,
      size: safe.size,
      font: fallback,
      color: rgb(0, 0, 0),
    });
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

    const cells: Array<[number | undefined, string | undefined, number | undefined]> = [
      [config.columns.name, passenger.passenger_name, widths.name],
      [config.columns.passport, passenger.passport_number, widths.passport],
      [config.columns.nationality, passenger.nationality, widths.nationality],
    ];

    for (const [colX, value, maxWidth] of cells) {
      if (colX === undefined || !value) continue;
      const fitted = fitTextToWidth(value, font, fontSize, maxWidth ?? 0);
      try {
        page.drawText(fitted.text, {
          x: colX,
          y,
          size: fitted.size,
          font,
          color: rgb(0, 0, 0),
        });
      } catch {
        const safe = fitTextToWidth(value.replace(/[^\x20-\x7E]/g, "?"), font, fontSize, maxWidth ?? 0);
        page.drawText(safe.text, { x: colX, y, size: safe.size, font, color: rgb(0, 0, 0) });
      }
    }

    rowOnPage++;
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

  for (const field of fieldConfig.fields) {
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
      company_name_ar: "نور بصيرتي للنقل",
      commercial_registration: "1010123456",
      vat_number: "300012345600003",
      company_phone: "+966 50 123 4567",
      company_email: "info@nourbasirti.com",
      company_address: "King Fahd Road, Riyadh",
      company_city: "Riyadh",
      company_country: "Saudi Arabia",
    },
    ride: {
      ride_number: "R-20250905-0001",
      date: "05/09/2025",
      time: "08:00",
      pickup: "Riyadh Airport",
      destination: "Makkah Hotel",
      trip_type: "Umrah Transfer",
      notes: "Sample ride for preview",
      datetime: "05/09/2025 08:00",
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
        passenger_name: "Mansoor Ahmed",
        passport_number: "CE1159477",
        nationality: "Pakistan",
        gender: "Male",
        visa_type: "Umrah",
      },
      {
        passenger_name: "Raja Shahid Nazir Janjua",
        passport_number: "AN8785242",
        nationality: "Pakistan",
        gender: "Male",
        visa_type: "Umrah",
      },
      {
        passenger_name: "Asma Mansoor",
        passport_number: "AK0711234",
        nationality: "Pakistan",
        gender: "Female",
        visa_type: "Umrah",
      },
    ],
    third_party: "Mansoor Ahmed and 2 others",
  };
}
