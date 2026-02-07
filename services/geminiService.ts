
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Custom error class to handle API quota issues specifically.
 */
export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaExceededError";
  }
}

async function handleApiCall<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error: any) {
    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      throw new QuotaExceededError("The AI curator is currently over-capacity. Please try again in a few minutes or use the manual 'Instant Archive' option.");
    }
    throw error;
  }
}

export async function analyzeStreetSign(imageData: string, neighborhood: string) {
  return handleApiCall(async () => {
    const prompt = `You are a typographic historian specializing in Bengaluru. Analyze this extreme macro close-up image of street lettering from ${neighborhood}. 
    Provide a JSON response:
    1. style: (e.g., Hand-painted Stencil, Enamel, Stone Carved, Ghost Sign)
    2. script: (e.g., Kannada, Latin, Urdu)
    3. observation: A brief, poetic observation about the 'micro-detail' like paint texture, serif style, or stroke width.
    4. colorPalette: 3 hex codes.
    5. materialGuess: (e.g., Granite, Rusted Metal, Weathered Wall)`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: imageData.split(',')[1] } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text);
  });
}

export async function generateVisualForArtifact(description: string) {
  return handleApiCall(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: `An extreme macro, hyper-realistic close-up photograph of Bengaluru street lettering: ${description}. Focus ONLY on the letterforms and their immediate surface (weathered paint, rusted iron, rough granite). ABSOLUTELY NO buildings, NO sky, NO people, NO trees, NO cars. The background should be a completely blurred bokeh of industrial textures. High-contrast, authentic archival photography style.` }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  });
}

export async function fetchAreaArtifacts(neighborhood: string) {
  return handleApiCall(async () => {
    const prompt = `Search for 3 real-world, specific 'micro-typographic' artifacts or tiny wayfinding details (like specific junction stencils on electric poles, tiny hand-painted gate signs, or small vintage enamel markers) documented in ${neighborhood}, Bengaluru.
    Scour for the tiniest documented details.
    For each, provide:
    - title: Specific detail name
    - location: Precise street corner or landmark
    - description: Focus strictly on the tiny typographic details (paint texture, script flourishes, material wear).
    - vibe: 1-word style.
    Return JSON array of objects. Use Google Search to find actual documented tiny heritage lettering details from this specific neighborhood.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      }
    });

    const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const data = JSON.parse(response.text);
    
    return {
      artifacts: data,
      sources: grounding || []
    };
  });
}

export async function translateContent(text: string, targetLanguage: string) {
  return handleApiCall(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate this text into ${targetLanguage}. Keep the soulful, zine-like tone. Return ONLY the translated text.\n\nText: ${text}`,
    });

    return response.text;
  });
}
