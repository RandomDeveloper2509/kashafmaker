import { extractPdfEmbeddedImages, extractPdfLayout } from "@/lib/pdf/extract-layout";
import { emptyExtraction, type LayoutToken, type VisaExtractionResult } from "./types";
import { validateVisaFile } from "./file-kind";
import { ocrImages } from "./ocr";
import { isExtractionComplete, isExtractionUseful, mergeExtractions, parseVisaFields } from "./parse-fields";
import { aiExtractVisa } from "./ai-vision";

export interface ExtractVisaInput {
  buffer: Uint8Array;
  mimeType?: string;
  fileName?: string;
}

export async function extractVisaInformation(input: ExtractVisaInput): Promise<VisaExtractionResult> {
  const validation = validateVisaFile(input.buffer, input.mimeType, input.fileName);
  if (!validation.ok) {
    throw Object.assign(new Error(validation.error), { status: 400 });
  }

  // --- 1. FOR PDFs: Run OCR Plus First (Native text layout + Embedded image OCR) ---
  // Fast local extraction (~50ms - 1s) without waiting for slow AI PDF rendering
  if (validation.kind === "pdf") {
    let pdfText = "";
    let pdfTextTokens: LayoutToken[] = [];
    let pdfImages: Buffer[] = [];

    // 1a. Native Text extraction
    try {
      const layout = await extractPdfLayout(input.buffer);
      pdfText = layout.text;
      pdfTextTokens = layout.tokens;
    } catch {
      // PDF.js couldn't parse
    }

    // 1b. Embedded images
    try {
      pdfImages = await extractPdfEmbeddedImages(input.buffer);
    } catch {
      pdfImages = [];
    }

    // Run OCR Plus (PDF native text + embedded image OCR)
    const ocrPlusResult = await extractFromPdf(input.buffer, pdfText, pdfTextTokens, pdfImages);

    // If OCR Plus got complete extraction or key fields (both fullName and passportNumber), return immediately!
    if (isExtractionComplete(ocrPlusResult) || (ocrPlusResult.fullName && ocrPlusResult.passportNumber)) {
      return { ...ocrPlusResult, needsPageRender: false };
    }

    // 1c. AI Vision fallback for PDFs (only when OCR Plus couldn't extract key fields)
    try {
      const aiResult = await aiExtractVisa({
        buffer: input.buffer,
        mimeType: input.mimeType,
        fileName: input.fileName,
        preExtractedImages: pdfImages.length > 0 ? pdfImages : undefined,
      });
      if (aiResult && (isExtractionComplete(aiResult) || aiResult.fullName || aiResult.passportNumber)) {
        return mergeExtractions(ocrPlusResult, aiResult);
      }
    } catch {
      // Fall through to ocrPlusResult
    }

    return ocrPlusResult;
  }

  // --- 2. FOR IMAGES: AI Vision First (super fast on images ~1-2s) ---
  try {
    const aiResult = await aiExtractVisa({
      buffer: input.buffer,
      mimeType: input.mimeType,
      fileName: input.fileName,
    });
    if (aiResult && (isExtractionComplete(aiResult) || aiResult.fullName || aiResult.passportNumber)) {
      return aiResult;
    }
  } catch {
    // Fall through to local OCR
  }

  // --- 3. Local OCR fallback for images ---
  return extractFromImage(Buffer.from(input.buffer));
}

async function extractFromPdf(
  data: Uint8Array,
  cachedText = "",
  cachedTokens: LayoutToken[] = [],
  cachedImages: Buffer[] = []
): Promise<VisaExtractionResult> {
  // Use cached text/tokens from step 1 if available
  let layoutText = cachedText;
  let tokens = cachedTokens;

  if (!layoutText) {
    try {
      const layout = await extractPdfLayout(data);
      layoutText = layout.text;
      tokens = layout.tokens;
    } catch {
      // PDF.js couldn't parse — use cached images or throw corrupt error
      const images = cachedImages.length > 0 ? cachedImages : [];
      if (images.length > 0) {
        try {
          const ocr = await ocrImages(images);
          if (ocr.text.trim()) {
            return parseVisaFields({ text: ocr.text, tokens: ocr.tokens, fromOcr: true, method: "ocr" });
          }
        } catch { /* fall through */ }
      }
      throw Object.assign(new Error("The PDF could not be read. The file may be corrupt."), { status: 400 });
    }
  }

  const textResult = parseVisaFields({ text: layoutText, tokens, fromOcr: false, method: "pdf_text" });
  if (isExtractionComplete(textResult)) {
    return { ...textResult, needsPageRender: false };
  }

  // Use cached images from step 1 if available, otherwise extract now
  const images = cachedImages.length > 0 ? cachedImages : await extractPdfEmbeddedImages(data).catch(() => []);

  if (!images.length) {
    return {
      ...textResult,
      warnings: unique([
        ...textResult.warnings,
        isExtractionUseful(textResult)
          ? "Some visa fields are still missing. Render the PDF pages and retry OCR, or enter them manually."
          : "The PDF has little or no selectable text. Render its pages and retry OCR, or enter the fields manually.",
      ]),
      needsPageRender: true,
    };
  }

  try {
    const ocr = await ocrImages(images);
    if (!ocr.text.trim()) {
      return {
        ...textResult,
        warnings: unique([...textResult.warnings, "OCR did not read any text from the scanned PDF pages."]),
        needsPageRender: true,
      };
    }
    const ocrResult = parseVisaFields({
      text: ocr.text,
      tokens: ocr.tokens,
      fromOcr: true,
      method: textResult.fullName || textResult.passportNumber ? "hybrid" : "ocr",
    });
    const merged = mergeExtractions(textResult, ocrResult);
    return { ...merged, needsPageRender: !isExtractionComplete(merged) };
  } catch {
    return {
      ...textResult,
      warnings: unique([...textResult.warnings, "OCR failed on the scanned PDF. You can retry or fill the fields manually."]),
      needsPageRender: true,
    };
  }
}

async function extractFromImage(image: Buffer): Promise<VisaExtractionResult> {
  try {
    const ocr = await ocrImages([image]);
    if (!ocr.text.trim()) {
      return emptyExtraction("ocr", ["OCR did not read any text from the image. Try a clearer photo or fill the fields manually."]);
    }
    return parseVisaFields({ text: ocr.text, tokens: ocr.tokens, fromOcr: true, method: "ocr" });
  } catch {
    throw Object.assign(new Error("OCR failed to read this image. Try another file or enter the details manually."), {
      status: 422,
    });
  }
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}
