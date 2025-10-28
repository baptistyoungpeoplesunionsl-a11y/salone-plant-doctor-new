// netlify/functions/diagnose.js
const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

// 1. Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error(
    "FATAL ERROR: GEMINI_API_KEY is missing in Netlify environment variables."
  );
}
const ai = new GoogleGenAI({ apiKey });

// Helper function from your original server.js
function dataURLToGenerativePart(imageDataURL) {
  const [mimeTypePart, base64Data] = imageDataURL.split(";base64,");
  const mimeType = mimeTypePart.replace("data:", "");
  return {
    inlineData: {
      data: base64Data,
      mimeType: mimeType,
    },
  };
}

// --- STRUCTURED OUTPUT CONFIGURATION (COPIED FROM server.js) ---
const systemInstruction =
  "You are the 'Salone Plant Doctor' expert. Your sole purpose is to analyze the user-provided image of a plant and provide a highly concise, structured diagnosis and treatment plan tailored for easy comprehension by a local farmer in Sierra Leone. Focus only on Tomato, Cassava, and Lettuce diagnosis.";

const responseSchema = {
  type: "object",
  properties: {
    plant_name: {
      type: "string",
      description:
        "The common name of the plant shown in the image (e.g., Cassava, Tomato, Lettuce).",
    },
    health_status: {
      type: "string",
      description: "A single word status: 'Healthy' or 'Unhealthy'.",
    },
    disease: {
      type: "string",
      description:
        "The most probable plant disease or deficiency name, or 'None' if healthy.",
    },
    confidence: {
      type: "string",
      description: "A confidence rating: High, Medium, or Low.",
    },
    cause: {
      type: "string",
      description:
        "A very brief, 1-2 sentence explanation of the cause of the issue, using simple language.",
    },
    treatment_steps: {
      type: "array",
      items: {
        type: "string",
        description:
          "A single, short, actionable step for treatment or prevention.",
      },
      description:
        "A list of 3-5 short, actionable treatment and prevention steps. Prioritize methods and products locally available in Sierra Leone.",
    },
    recommendation_summary: {
      type: "string",
      description:
        "A single, short, encouraging sentence summarizing the most important next step for the farmer (e.g., 'Start fungicide treatment immediately.').",
    },
    status_class: {
      type: "string",
      description:
        "A CSS class for the frontend: 'status-healthy' or 'status-unhealthy'.",
    },
  },
  required: [
    "plant_name",
    "health_status",
    "disease",
    "confidence",
    "cause",
    "treatment_steps",
    "recommendation_summary",
    "status_class",
  ],
};
// --- END STRUCTURED OUTPUT CONFIGURATION ---

// 2. The Netlify Handler (Replaces app.post('/diagnose'))
exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // Netlify requires parsing the body string
    // Netlify Function payload limit is 6MB. Your compression should keep it safe.
    const { imageDataURL, prompt } = JSON.parse(event.body);

    if (!imageDataURL || !prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing image data or prompt." }),
      };
    }

    const imagePart = dataURLToGenerativePart(imageDataURL);

    // 3. CALL THE GEMINI API
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [imagePart, { text: prompt }] }],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const diagnosisData = JSON.parse(response.text);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(diagnosisData),
    };
  } catch (error) {
    console.error("Error during Gemini API call:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error in Netlify Function.",
        details: error.message,
      }),
    };
  }
};
