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
    coverRects: [],
    fields: [
      field("p1-date", "date", 1, 422, 170, 92, { fontSize: 11.5, pdfBaseline: 613, align: "center" }),
      field("p1-pickup", "pickup", 1, 420, 436, 88, { fontSize: 10.5, pdfBaseline: 349, align: "center" }),
      field("p1-dest", "destination", 1, 166, 433, 78, { fontSize: 10.5, pdfBaseline: 350.5, align: "center" }),
      field("p2-phone", "driver_phone", 2, 36, 158, 90, { fontSize: 10.5, pdfBaseline: 620, align: "center" }),
      field("p2-iqama", "iqama_number", 2, 148, 158, 78, { fontSize: 10.5, pdfBaseline: 620, align: "center" }),
      field("p2-driver", "driver_name", 2, 236, 158, 150, { fontSize: 10.5, pdfBaseline: 620, wrapLines: 2, height: 28, align: "center" }),
      field("p2-plate", "plate_number", 2, 390, 158, 72, { fontSize: 10.5, pdfBaseline: 620, align: "center" }),
      field("p2-vehicle", "vehicle_display", 2, 484, 158, 90, { fontSize: 10.5, pdfBaseline: 620, align: "center" }),
      field("p2-notes", "notes", 2, 36, 238, 204, { fontSize: 10.5, pdfBaseline: 540, align: "center" }),
      field("p2-visa", "trip_type", 2, 262, 238, 86, { fontSize: 10.5, pdfBaseline: 540, align: "center" }),
      field("p2-flight", "flight_number", 2, 368, 238, 92, { fontSize: 10.5, pdfBaseline: 540, align: "center" }),
      field("p2-date", "datetime", 2, 482, 238, 92, { fontSize: 10.5, pdfBaseline: 540, align: "center" }),
      field("p1-third", "third_party", 1, 100, 362, 395, { fontSize: 10.5, pdfBaseline: 423, align: "right" }),
    ],
    passengerTable: {
      page: 2,
      startX: 38,
      startY: 314,
      rowHeight: 23,
      maxRows: 15,
      fontSize: 10.5,
      fontFamily: "Helvetica",
      direction: "ltr",
      allowOverflow: false,
      hideUnusedRows: true,
      textColor: [0.28, 0.28, 0.28], // Professional soft gray as in reference image
      columns: {
        name: 290,
        passport: 182,
        nationality: 22,
      },
      columnWidths: {
        name: 250,
        passport: 104,
        nationality: 156,
      },
      rowBaselines: [
        476.0, 453.0, 430.0, 407.0, 385.0, 362.0, 339.0, 316.0, 293.0, 270.0, 247.0, 224.0, 201.0, 178.0, 155.0,
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
