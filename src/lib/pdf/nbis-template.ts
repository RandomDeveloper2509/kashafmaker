import { TemplateField, TemplateFieldConfig } from "./types";

function field(
  id: string,
  key: string,
  page: number,
  x: number,
  y: number,
  width: number,
  extra: Partial<TemplateField> = {}
): TemplateField {
  return {
    id,
    field: key,
    page,
    x,
    y,
    width,
    height: extra.height ?? 16,
    fontSize: extra.fontSize ?? 10,
    fontFamily: extra.fontFamily ?? "Helvetica",
    align: extra.align ?? "left",
    direction: extra.direction ?? "ltr",
    bold: extra.bold ?? false,
    type: "text",
    ...extra,
  };
}

/** Coordinates measured from the official NBIS Kashaf PDF (US Letter, origin bottom-left). */
export function getNbisKashafFieldConfig(): TemplateFieldConfig {
  return {
    coverRects: [
      { page: 1, x: 417.5, y: 601.2, width: 103, height: 26 },
      { page: 1, x: 290.6, y: 411.8, width: 204.3, height: 23 },
      { page: 1, x: 414.3, y: 338.5, width: 95, height: 23 },
      { page: 1, x: 160.4, y: 341.6, width: 84.2, height: 23 },
    ],
    fields: [
      field("p1-date", "date", 1, 422, 170, 92, { fontSize: 12, pdfBaseline: 610 }),
      field("p1-pickup", "pickup", 1, 418, 436, 88, { fontSize: 11, pdfBaseline: 347 }),
      field("p1-dest", "destination", 1, 164, 433, 78, { fontSize: 11, pdfBaseline: 348.5 }),
      field("p2-phone", "driver_phone", 2, 36, 158, 90, { fontSize: 10, pdfBaseline: 623 }),
      field("p2-iqama", "iqama_number", 2, 148, 158, 78, { fontSize: 10, pdfBaseline: 623 }),
      field("p2-driver", "driver_name", 2, 236, 158, 150, { fontSize: 10, pdfBaseline: 623, wrapLines: 2, height: 28 }),
      field("p2-plate", "plate_number", 2, 390, 158, 72, { fontSize: 10, pdfBaseline: 623 }),
      field("p2-vehicle", "vehicle_display", 2, 484, 158, 90, { fontSize: 10, pdfBaseline: 623 }),
      field("p2-notes", "notes", 2, 36, 238, 204, { fontSize: 10, pdfBaseline: 543 }),
      field("p2-visa", "trip_type", 2, 262, 238, 86, { fontSize: 10, pdfBaseline: 543 }),
      field("p2-ride", "ride_number", 2, 368, 238, 92, { fontSize: 10, pdfBaseline: 543 }),
      field("p2-date", "datetime", 2, 482, 238, 92, { fontSize: 10, pdfBaseline: 543 }),
      field("p1-third", "third_party", 1, 100, 362, 395, { fontSize: 10, pdfBaseline: 420, align: "right" }),
    ],
    passengerTable: {
      page: 2,
      startX: 38,
      startY: 314,
      rowHeight: 23,
      maxRows: 15,
      fontSize: 10,
      fontFamily: "Helvetica",
      direction: "ltr",
      allowOverflow: false,
      hideUnusedRows: true,
      columns: {
        name: 292,
        passport: 192,
        nationality: 38,
      },
      columnWidths: {
        name: 240,
        passport: 82,
        nationality: 136,
      },
      rowBaselines: [
        479.5, 456.5, 433.4, 410.4, 388.4, 365.4, 342.3, 319.3, 296.2, 273.2, 250.2, 227.1, 204.1, 181.0, 158.0,
      ],
      rowBottoms: [
        469.15, 446.11, 423.07, 401.23, 378.19, 355.13, 332.09, 309.05, 286.01, 262.97, 239.93, 216.77, 193.73, 170.66,
        147.62,
      ],
      unusedMask: {
        x: 18.24,
        width: 573.22,
        minY: 147.14,
        firstRowTop: 491.71,
      },
    },
  };
}

export function isNbisStyleTemplate(pageCount: number, width?: number, height?: number) {
  if (pageCount !== 2) return false;
  if (!width || !height) return true;
  return Math.abs(width - 612) < 20 && Math.abs(height - 792) < 20;
}
