export type TextAlign = "left" | "center" | "right";
export type TextDirection = "ltr" | "rtl";

export interface TemplateField {
  id: string;
  field: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  align: TextAlign;
  direction: TextDirection;
  bold: boolean;
  letterSpacing?: number;
  type: "text" | "image";
  /** If set, used as pdf-lib Y (origin bottom-left) instead of converting from top-origin `y`. */
  pdfBaseline?: number;
  /** Wrap onto extra lines instead of truncating with "...". */
  wrapLines?: number;
}

export interface PassengerTableConfig {
  page: number;
  startX: number;
  startY: number;
  rowHeight: number;
  maxRows: number;
  columns: {
    number?: number;
    name: number;
    passport: number;
    nationality: number;
    gender?: number;
    visaType?: number;
  };
  fontSize: number;
  fontFamily: string;
  direction: TextDirection;
  allowOverflow?: boolean;
  columnWidths?: {
    name?: number;
    passport?: number;
    nationality?: number;
  };
  hideUnusedRows?: boolean;
  /** pdf-lib Y of the bottom edge of each passenger data row (index 0 = first passenger). */
  rowBottoms?: number[];
  /** pdf-lib Y baselines for passenger text in each row. */
  rowBaselines?: number[];
  unusedMask?: {
    x: number;
    width: number;
    /** Bottom of the printed table (pdf-lib Y). */
    minY: number;
    /** Top of the first passenger row (pdf-lib Y), used when there are zero passengers. */
    firstRowTop?: number;
  };
}

export interface PdfCoverRect {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TemplateFieldConfig {
  [key: string]: unknown;
  fields: TemplateField[];
  passengerTable?: PassengerTableConfig;
  /** Clip these areas and redraw the letterhead so guide boxes / unused rows disappear without white patches. */
  coverRects?: PdfCoverRect[];
}

export interface KashafDataContext {
  company: {
    company_name?: string;
    company_name_ar?: string;
    commercial_registration?: string;
    vat_number?: string;
    company_phone?: string;
    company_email?: string;
    company_address?: string;
    company_city?: string;
    company_country?: string;
    company_logo?: string;
  };
  ride: {
    ride_number?: string;
    date?: string;
    time?: string;
    datetime?: string;
    pickup?: string;
    destination?: string;
    trip_type?: string;
    notes?: string;
  };
  driver: {
    driver_name?: string;
    driver_name_ar?: string;
    iqama_number?: string;
    driver_phone?: string;
    nationality?: string;
    license_number?: string;
  };
  vehicle: {
    vehicle_type?: string;
    vehicle_make?: string;
    vehicle_model?: string;
    plate_number?: string;
    vehicle_id?: string;
    vehicle_color?: string;
    vehicle_capacity?: string;
    vehicle_display?: string;
  };
  passengers: Array<{
    passenger_name?: string;
    passport_number?: string;
    nationality?: string;
    gender?: string;
    visa_type?: string;
  }>;
  third_party?: string;
}

export const DYNAMIC_FIELDS = {
  company: [
    { key: "company_name", label: "Company Name" },
    { key: "company_name_ar", label: "Company Name (Arabic)" },
    { key: "commercial_registration", label: "Commercial Registration" },
    { key: "vat_number", label: "VAT Number" },
    { key: "company_phone", label: "Company Phone" },
    { key: "company_email", label: "Company Email" },
    { key: "company_address", label: "Company Address" },
    { key: "company_city", label: "Company City" },
    { key: "company_country", label: "Company Country" },
    { key: "company_logo", label: "Company Logo", type: "image" },
  ],
  ride: [
    { key: "ride_number", label: "Ride Number" },
    { key: "date", label: "Date" },
    { key: "time", label: "Time" },
    { key: "datetime", label: "Date and Time" },
    { key: "pickup", label: "Pickup Location" },
    { key: "destination", label: "Destination" },
    { key: "trip_type", label: "Trip Type" },
    { key: "notes", label: "Notes" },
  ],
  driver: [
    { key: "driver_name", label: "Driver Name" },
    { key: "driver_name_ar", label: "Driver Name (Arabic)" },
    { key: "iqama_number", label: "Iqama Number" },
    { key: "driver_phone", label: "Driver Phone" },
    { key: "nationality", label: "Nationality" },
    { key: "license_number", label: "License Number" },
  ],
  vehicle: [
    { key: "vehicle_type", label: "Vehicle Type" },
    { key: "vehicle_make", label: "Vehicle Make" },
    { key: "vehicle_model", label: "Vehicle Model" },
    { key: "vehicle_display", label: "Make and Model" },
    { key: "plate_number", label: "Plate Number" },
    { key: "vehicle_id", label: "Vehicle ID" },
    { key: "vehicle_color", label: "Vehicle Color" },
    { key: "vehicle_capacity", label: "Vehicle Capacity" },
  ],
  passenger: [
    { key: "passenger_name", label: "Passenger Name" },
    { key: "passport_number", label: "Passport Number" },
    { key: "nationality", label: "Nationality" },
    { key: "gender", label: "Gender" },
    { key: "visa_type", label: "Visa Type" },
  ],
} as const;

export function resolveFieldValue(field: string, context: KashafDataContext): string {
  const [category, ...rest] = field.split(".");
  const key = rest.length > 0 ? rest.join(".") : field;

  if (field.startsWith("passengers[")) {
    const match = field.match(/passengers\[(\d+)\]\.(\w+)/);
    if (match) {
      const index = parseInt(match[1], 10);
      const prop = match[2];
      const passenger = context.passengers[index];
      if (passenger) {
        return (passenger as Record<string, string | undefined>)[prop] || "";
      }
    }
    return "";
  }

  const categoryMap: Record<string, Record<string, string | undefined>> = {
    company: context.company as Record<string, string | undefined>,
    ride: context.ride as Record<string, string | undefined>,
    driver: context.driver as Record<string, string | undefined>,
    vehicle: context.vehicle as Record<string, string | undefined>,
    third_party: { third_party: context.third_party } as Record<string, string | undefined>,
  };

  if (categoryMap[category]) {
    return categoryMap[category][key] || categoryMap[category][field] || "";
  }

  // Handle top-level fields like third_party
  if (context[field as keyof KashafDataContext]) {
    return String(context[field as keyof KashafDataContext]);
  }

  for (const cat of Object.values(categoryMap)) {
    if (cat[field]) return cat[field] || "";
  }

  if (field === "third_party") {
    if (context.third_party) return context.third_party;
    if (context.passengers && context.passengers.length > 0) {
      const first = context.passengers[0].passenger_name || "";
      const others = context.passengers.length > 1 ? ` and ${context.passengers.length - 1} others` : "";
      return `${first}${others}`;
    }
    return "";
  }
  if (field === "destination") return context.ride.destination || "";
  if (field === "pickup") return context.ride.pickup || "";
  if (field === "datetime") return context.ride.datetime || `${context.ride.date || ""} ${context.ride.time || ""}`.trim();

  return "";
}

export function buildContextFromSnapshot(snapshot: Record<string, unknown>): KashafDataContext {
  const passengers = (snapshot.passengers as KashafDataContext["passengers"]) || [];
  const thirdParty =
    typeof snapshot.third_party === "string"
      ? snapshot.third_party
      : passengers.length > 0
        ? `${passengers[0]?.passenger_name || ""}${passengers.length > 1 ? ` and ${passengers.length - 1} others` : ""}`
        : undefined;

  return {
    company: (snapshot.company as KashafDataContext["company"]) || {},
    ride: (snapshot.ride as KashafDataContext["ride"]) || {},
    driver: (snapshot.driver as KashafDataContext["driver"]) || {},
    vehicle: (snapshot.vehicle as KashafDataContext["vehicle"]) || {},
    passengers,
    third_party: thirdParty,
  };
}
