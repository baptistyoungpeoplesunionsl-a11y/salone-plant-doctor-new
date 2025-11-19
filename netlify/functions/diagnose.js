// netlify/functions/diagnose.js
const { GoogleGenAI } = require("@google/genai");
// require("dotenv").config(); // REMOVED: Netlify production uses dashboard variables

// 1. Initialize Gemini Client
// Netlify production environment variables are accessed directly via process.env
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  // Use a more generic message for the Netlify logs since the key is a secret
  console.error(
    "FATAL ERROR: GEMINI_API_KEY is missing in environment variables."
  );
}
// Note: If apiKey is undefined, the ai object creation will likely fail later, which is handled by the try/catch.
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

// --- STRUCTURED OUTPUT CONFIGURATION (MODIFIED for Krio Audio Keys, Cause, and Treatment) ---
const systemInstruction =
  "You are the 'Salone Plant Doctor' expert. Your sole purpose is to analyze the user-provided image of a plant and provide a highly concise, structured diagnosis and treatment plan tailored for easy comprehension by a local farmer in Sierra Leone. For the fields 'disease_audio_key' and 'summary_audio_key', you MUST output a single, URL-friendly, lowercase, hyphenated key (e.g., 'late-blight' or 'increase-water'). Do not output the full translation. Focus only on Tomato, Cassava, and Lettuce diagnosis.";

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
    disease_audio_key: {
      type: "string",
      description:
        "A single, lowercase, hyphenated key based on the disease name (e.g., 'early-blight' or 'healthy'). MUST be URL-friendly.",
    },
    confidence: {
      type: "string",
      description: "A confidence rating: High, Medium, or Low.",
    },
    cause: {
      // <--- REQUIRED FOR THE 'CAUSE' SECTION
      type: "string",
      description:
        "A very brief, 1-2 sentence explanation of the cause of the issue, using simple language.",
    },
    treatment_steps: {
      // <--- REQUIRED FOR THE 'TREATMENT PLAN' SECTION
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
    summary_audio_key: {
      // <--- REQUIRED FOR THE 'SUMMARY AUDIO'
      type: "string",
      description:
        "A single, lowercase, hyphenated key representing the summary's core action (e.g., 'start-fungicide' or 'keep-monitoring'). MUST be URL-friendly.",
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
    "disease_audio_key",
    "summary_audio_key",
    "status_class",
  ],
};
// --- END STRUCTURED OUTPUT CONFIGURATION ---

// 2. The Netlify Handler
exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    if (!apiKey) {
      throw new Error("API Key not configured.");
    }

    const { imageDataURL, prompt } = JSON.parse(event.body);

    if (!imageDataURL || !prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing image data or prompt." }),
      };
    }

    const imagePart = dataURLToGenerativePart(imageDataURL);

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

    // Add the image data URL to the response for display on the frontend result page
    diagnosisData.image_data_url = imageDataURL;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(diagnosisData),
    };
  } catch (error) {
    console.error("Error during diagnosis:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Diagnosis processing failed.",
        details: error.message,
      }),
    };
  }
};
