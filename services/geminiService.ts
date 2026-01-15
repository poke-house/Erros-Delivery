import { GoogleGenAI, Type } from "@google/genai";
import { OrderError } from "../types.ts";
import { fileToBase64 } from "../utils/fileHelpers.ts";

const extractOrdersFromPdf = async (file: File): Promise<OrderError[]> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key is missing in environment variables.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const base64Data = await fileToBase64(file);

    // Schema definition matches strict requirements
    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          orderNumber: { type: Type.STRING, description: "The unique order ID." },
          restaurantName: { 
            type: Type.STRING, 
            description: "The normalized restaurant name based on address/branch rules." 
          },
          date: { type: Type.STRING, description: "Date of the order." },
          time: { type: Type.STRING, description: "Time of the order." },
          customerName: { type: Type.STRING, description: "Name of the customer. Use 'N/A' if not visible." },
          platform: { 
            type: Type.STRING, 
            enum: ["Glovo", "Uber Eats", "Bolt", "Unknown"],
            description: "The platform name." 
          }
        },
        required: ["orderNumber", "restaurantName", "date", "time", "platform"],
      },
    };

    const prompt = `
      Analyze this PDF document, which is a printed order history report.
      Extract a list of ALL orders visible in the table rows with 100% accuracy.

      CRITICAL: You must NORMALIZE the 'restaurantName' field based on the address or branch name found in each row.
      Use the following STRICT mapping rules:

      1. IF address/name contains "Infante Santo"  -> Set name to "Inf Santo"
      2. IF address/name contains "Sérgio Malpique" OR "Almada" -> Set name to "Almada Fórum"
      3. IF address/name contains "Fernão Lopes" OR "Miraflores" -> Set name to "Miraflores"
      4. IF address/name contains "Cavaleiros" OR "Alfragide" -> Set name to "Alfragide"
      5. IF address/name contains "Duarte Pacheco" OR "Amoreiras" -> Set name to "Amoreiras"
      
      If none of the above match, use the raw store name visible in the row.

      Field Extraction Guidelines:
      - **Order ID**: Extract the exact ID (e.g., 2E955, 10154...).
      - **Date**: Extract the date. If the row says "Today" or "Yesterday", use the document header date (e.g. 14/01/26) to calculate the actual date (YYYY-MM-DD).
      - **Time**: Extract the time exactly as shown.
      - **Customer Name**: Extract if visible (common in Uber/Bolt). If not present (common in Glovo), use "N/A".
      - **Platform**: Detect if the document is from "Glovo", "Uber Eats", or "Bolt".

      Return the data strictly in JSON format.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Data,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1, // Low temperature for higher factuality/precision
      },
    });

    const text = response.text;
    if (!text) return [];

    const data = JSON.parse(text) as OrderError[];
    return data;

  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
};

export { extractOrdersFromPdf };