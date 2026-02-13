import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export async function detectSign(base64Image) {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: "Identify the sign language gesture shown in this image. Reply with only the detected word." },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }
        ]
      }
    );

    const candidates = response?.data?.candidates;
    if (candidates && candidates[0]?.content?.parts?.[0]?.text) {
      return candidates[0].content.parts[0].text.trim();
    }
    return "Unknown";
  } catch (error) {
    console.error("Gemini API error:", error.message);
    throw new Error("Gemini detection failed");
  }
}