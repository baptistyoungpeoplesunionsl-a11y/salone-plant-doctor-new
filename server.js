// server.js
// --- Salone Plant Doctor AI Diagnosis Backend ---

// 1. Import necessary libraries
const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

// Load environment variables from .env file (for local development)
dotenv.config();

// 2. Initialize Express app and set port
const app = express();
const port = process.env.PORT || 3000;

// 3. --- SECURITY CRITICAL: API KEY SETUP ---
const apiKey = process.env.GEMINI_API_KEY;

// Check if the API key is missing
if (!apiKey) {
  console.error(
    "FATAL ERROR: Please set your Gemini API Key in the .env file as GEMINI_API_KEY."
  );
  process.exit(1);
}

// Initialize the GoogleGenAI client
const ai = new new GoogleGenAI({ apiKey })();

// 4. Configure Middleware
// Use CORS to allow requests from your local front-end
app.use(cors());

// Use body-parser to handle the incoming image data (which can be large)
// Setting limit to '20mb' provides ample room for high-resolution images converted to Base64.
app.use(bodyParser.json({ limit: "20mb" }));

// 5. --- DIAGNOSIS API ENDPOINT (/diagnose) ---
app.post("/diagnose", async (req, res) => {
  try {
    const { imageDataURL, prompt } = req.body;

    if (!imageDataURL || !prompt) {
      console.error("Missing required fields: imageDataURL or prompt.");
      return res.status(400).json({ error: "Missing image data or prompt." });
    }

    // Log receipt of the request for debugging
    console.log(
      `[SERVER] Processing new request. Data URL length: ${imageDataURL.length}.`
    );

    // Helper to convert the Data URL string (e.g., data:image/jpeg;base64,...)
    // to the expected Part format for the Gemini API.
    const [mimeTypePart, base64Data] = imageDataURL.split(";base64,");
    const mimeType = mimeTypePart.replace("data:", "");

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    // --- Structured Output Configuration (JSON Mode) ---
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

    // Call the Gemini API with JSON Mode and Structured Schema
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [imagePart, { text: prompt }] }],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    // The response.text is guaranteed to be a valid JSON string in JSON Mode
    const diagnosisData = JSON.parse(response.text);

    // Send the clean, structured JSON response back to the front-end
    res.status(200).json(diagnosisData);
  } catch (error) {
    console.error("Error during Gemini API call:", error.message);

    // Return a generic error to the frontend
    res.status(500).json({
      error:
        "Internal server error while processing diagnosis. Check API key, quota, or network details.",
      details: error.message,
    });
  }
});

// 6. Start the server
app.listen(port, () => {
  console.log(`Diagnosis server running at http://localhost:${port}`);
  console.log(`Ready to receive requests from your browser.`);
});
