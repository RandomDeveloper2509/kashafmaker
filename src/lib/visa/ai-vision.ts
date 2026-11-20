import type { VisaExtractionResult, VisaFieldKey, FieldResult } from "./types";
import { isCountryOrNationality } from "./parse-fields";

interface AiVisaPayload {
  fullName?: string;
  passportNumber?: string;
  nationality?: string;
  visaType?: string;
}

// ---- Multi-key rotation for Gemini ----
// Supports GEMINI_API_KEYS=key1,key2,key3 (comma-separated) OR single GEMINI_API_KEY.
// Round-robin through keys so each key gets its own rate limit window.
let geminiKeyIndex = 0;

function getGeminiKeys(): string[] {
  const multi = (process.env.GEMINI_API_KEYS || "").trim();
  if (multi) {
    return multi.split(",").map((k) => k.trim()).filter(Boolean);
  }
  const single = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").trim();
  return single ? [single] : [];
}

function nextGeminiKey(): string | null {
  const keys = getGeminiKeys();
  if (keys.length === 0) return null;
  const key = keys[geminiKeyIndex % keys.length];
  geminiKeyIndex++;
  return key;
}

// Groq model for vision
const GROQ_VISION_MODEL = "qwen/qwen3.8-27b";
// Gemini model for vision (single best available)
const GEMINI_VISION_MODEL = "gemini-3.5-flash-lite";

export async function aiExtractVisa(input: {
  buffer: Uint8Array;
  mimeType?: string;
  fileName?: string;
  preExtractedImages?: Buffer[];
}): Promise<VisaExtractionResult | null> {
  // In unit test environment, bypass external network requests unless explicitly enabled
  if (process.env.NODE_ENV === "test" && !process.env.ENABLE_AI_IN_TESTS) {
    return null;
  }

  const groqKey = (
    process.env.GROQ_API_KEY ||
    process.env.NEXT_PUBLIC_GROQ_API_KEY
  )?.trim();

  const geminiKey = nextGeminiKey();

  if (!groqKey && !geminiKey) return null;
  try {
    let mimeType = (input.mimeType || "").toLowerCase();
    let imageBuffer = Buffer.from(input.buffer);

    // Determine correct MIME type
    if (!mimeType || mimeType === "application/octet-stream") {
      const ext = (input.fileName?.split(".").pop() || "").toLowerCase();
      if (ext === "pdf") mimeType = "application/pdf";
      else if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
      else if (ext === "webp") mimeType = "image/webp";
      else mimeType = "image/png";
    }

    // If caller already extracted PDF images, use the first one directly
    if (input.preExtractedImages && input.preExtractedImages.length > 0) {
      imageBuffer = Buffer.from(input.preExtractedImages[0]) as Buffer<ArrayBuffer>;
      mimeType = "image/png";
    }

    // Compress images to lightweight JPEG for fast upload
    if (mimeType.startsWith("image/")) {
      try {
        const sharp = (await import("sharp")).default;
        imageBuffer = await sharp(imageBuffer)
          .rotate()
          .flatten({ background: "#ffffff" })
          .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
        mimeType = "image/jpeg";
      } catch {
        // Continue with original buffer if sharp fails
      }
    }

    const base64Data = imageBuffer.toString("base64");

    const prompt = `You are an expert immigration document and visa analyzer.
Analyze this visa, passport, or travel permit document (which may be in English, Arabic, or bilingual, scanned, photographed, or digital).
Extract the traveler/passenger information into a valid JSON object with exactly these 4 keys:

1. "fullName": The full personal name of the visa holder or passenger in English (e.g. "MOHAMMED KHALID AL-HARBI").
   - NEVER include label prefixes like "The Name", "thename", "Name:", "Holder:", "Applicant:", "Beneficiary:", or "الاسم".
   - NEVER include titles like "MR", "MRS", "MS".
   - CRITICAL: A passenger's name is NEVER a country or nationality. If the personal traveler name is not on the document, leave it empty "".

2. "passportNumber": The passport number or primary travel document number (e.g. "A12345678", "P98765432").
   - Do not include Visa Number, Border Number, or Application Number here.

3. "nationality": The traveler's nationality or country of citizenship in standard English (e.g. "Saudi Arabia", "Pakistan", "India", "Egypt", "Indonesia", "United Kingdom", "United States", "Bangladesh", "Turkey", "Jordan", "Syria").
   - If written in Arabic (like "باكستان" or "مصر" or "المملكة العربية السعودية"), convert to standard English country name.

4. "visaType": The visa type (e.g. "Umrah", "Tourism Visit", "Business", "Work", "Family Visit", "Residence").
   - If Umrah, return strictly "Umrah" with no trailing hyphens or entry types.

If any field is missing or cannot be found from the document, set its value to an empty string "".`;

    let payload: AiVisaPayload | null = null;
    let lastError = "";

    // 1. Primary: Groq Vision — ultra-fast ~1s, 3s timeout to fail fast on rate limits
    if (groqKey && mimeType.startsWith("image/")) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: GROQ_VISION_MODEL,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType};base64,${base64Data}`,
                    },
                  },
                ],
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 300,
          }),
        });

        clearTimeout(timeout);

        if (groqRes.ok) {
          const data = await groqRes.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            if (parsed && (parsed.fullName || parsed.passportNumber)) {
              payload = parsed;
            }
          }
        } else {
          const errBody = await groqRes.text().catch(() => groqRes.statusText);
          lastError = `Groq HTTP ${groqRes.status}: ${errBody.slice(0, 150)}`;
          console.warn("[ai-vision] Groq failed:", lastError);
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.warn("[ai-vision] Groq error:", lastError);
      }
    }

    // 2. Fallback: Google Gemini (uses rotated key)
    if ((!payload || (!payload.fullName && !payload.passportNumber)) && geminiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_VISION_MODEL}:generateContent?key=${geminiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: mimeType, data: base64Data } },
                ],
              },
            ],
            generationConfig: {
              response_mime_type: "application/json",
              temperature: 0.1,
            },
          }),
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          const rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawJsonText) {
            const parsed = JSON.parse(rawJsonText);
            if (parsed && (parsed.fullName || parsed.passportNumber)) {
              payload = parsed;
            }
          }
        } else {
          const errBody = await response.text().catch(() => response.statusText);
          lastError = `Gemini HTTP ${response.status}: ${errBody.slice(0, 200)}`;
          console.warn("[ai-vision] Gemini failed:", lastError);
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.warn("[ai-vision] Gemini error:", lastError);
      }
    }

    if (!payload || (!payload.fullName && !payload.passportNumber)) {
      console.warn("[ai-vision] all providers failed. Last error:", lastError);
      return null;
    }

    // Clean any accidental "the" or "thename" prefixes from AI output
    let fullName = (payload.fullName || "").trim();
    fullName = fullName
      .replace(/^(?:the\s*name|thename|the|name)\b\s*[:.\-]?\s*/gi, "")
      .replace(/\s+\bthe\b$/gi, "")
      .replace(/^[-–—|:;,\s]+|[-–—|:;,\s]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();

    let passportNumber = (payload.passportNumber || "").trim().toUpperCase();
    passportNumber = passportNumber.replace(/[^A-Z0-9-]/g, "");

    let nationality = (payload.nationality || "").trim();
    let visaType = (payload.visaType || "").trim();

    // Invalidate fullName if it was accidentally assigned a country or matches nationality
    if (
      isCountryOrNationality(fullName) ||
      (nationality && fullName.toLowerCase() === nationality.toLowerCase())
    ) {
      fullName = "";
    }

    // Standardize visaType and strip unwanted agency / office suffixes
    const lowerVisa = visaType.toLowerCase();
    if (lowerVisa.includes("umrah") || lowerVisa.includes("عمرة")) {
      visaType = "Umrah";
    } else if (lowerVisa.includes("hajj") || lowerVisa.includes("حج")) {
      visaType = "Hajj";
    } else if (lowerVisa.includes("touris") || lowerVisa.includes("سياح")) {
      visaType = "Tourism Visit";
    } else if (lowerVisa.includes("family") || lowerVisa.includes("عائلي")) {
      visaType = "Family Visit";
    } else if (lowerVisa.includes("business") || lowerVisa.includes("عمل") || lowerVisa.includes("تجاري")) {
      visaType = "Business Visit";
    } else if (lowerVisa.includes("transit") || lowerVisa.includes("مرور")) {
      visaType = "Transit";
    } else {
      visaType = visaType.split(/\b(?:office|company|agency|sponsor|journey)\b/i)[0].trim();
    }

    const fields: Record<VisaFieldKey, FieldResult> = {
      fullName: {
        value: fullName,
        status: fullName ? "ok" : "missing",
        labeled: Boolean(fullName),
      },
      passportNumber: {
        value: passportNumber,
        status: passportNumber ? "ok" : "missing",
        labeled: Boolean(passportNumber),
      },
      nationality: {
        value: nationality,
        status: nationality ? "ok" : "missing",
        labeled: Boolean(nationality),
      },
      visaType: {
        value: visaType,
        status: visaType ? "ok" : "missing",
        labeled: Boolean(visaType),
      },
    };

    const warnings: string[] = [];
    if (!fullName) warnings.push("Full name was not extracted.");
    if (!passportNumber) warnings.push("Passport number was not extracted.");
    if (!nationality) warnings.push("Nationality was not extracted.");
    if (!visaType) warnings.push("Visa type was not extracted.");

    return {
      fullName,
      passportNumber,
      nationality,
      visaType,
      fields,
      method: "ai_vision",
      warnings,
      needsPageRender: false,
    };
  } catch {
    return null;
  }
}
