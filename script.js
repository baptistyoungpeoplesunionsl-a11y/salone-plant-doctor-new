// --- Salone Plant Doctor Frontend Logic ---

// ----------------------------------------------------
// GLOBAL VARIABLE DECLARATIONS
// ----------------------------------------------------

const CART_STORAGE_KEY = "salonePlantDoctorCart";
let videoStream = null;

// --- Diagnosis DOM Element Selectors ---
// Ensure these IDs exist in your diagnosis.html
const startCameraButton = document.getElementById("start-camera-button"); // Open Camera button
const uploadPhotoButton = document.getElementById("upload-photo-button"); // Upload Picture button
const captureButton = document.getElementById("capture-button");
const cameraFeed = document.getElementById("camera-feed"); // <video> element
const cameraPlaceholder = document.getElementById("camera-placeholder"); // Placeholder text/div
const fileUploadInput = document.getElementById("file-upload-input"); // Hidden <input type="file">
const cameraContainer = document.getElementById("camera-container"); // Camera/Upload View
const scanProcessing = document.getElementById("scan-processing"); // Processing View
const resultCanvas = document.getElementById("result-canvas"); // <canvas> for image capture
const finishScanButton = document.getElementById("finish-scan-button"); // For the results page
// NOTE: I've removed selectors for scanResults, diagnosisText, treatmentPlan, etc.,
// as those belong primarily to the script on result.html now.

// ************************************************************
// *** MODIFIED BLOCK: Conditional API_ENDPOINT for Local vs. Production ***
// ************************************************************

// Check if the current environment is local (running on 127.0.0.1 or localhost)
const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

// Set API_ENDPOINT conditionally.
// If local (for VS Code Live Server + netlify dev), use the absolute URL to port 8888.
// If production (live on Netlify), use the safe relative path.
const API_ENDPOINT = isLocalhost
  ? "http://localhost:8888/.netlify/functions/diagnose"
  : "/.netlify/functions/diagnose";

const API_TIMEOUT_MS = 25000; // Set timeout to 25 seconds for mobile networks

// ----------------------------------------------------
// 1. E-COMMERCE: Local Storage Cart Management (Unchanged)
// ----------------------------------------------------

function loadCart() {
  const cartJson = localStorage.getItem(CART_STORAGE_KEY);
  return cartJson ? JSON.parse(cartJson) : [];
}

function saveCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  updateCartCount();
}

function addItemToCartAndCheckout(name, price) {
  const cart = [{ name, price }];
  saveCart(cart);
  window.location.href = "./checkout.html"; // Adjusted for relative path use on result.html/diagnosis.html
}

// ----------------------------------------------------
// 2. UX: Dynamic Header & Mobile Nav Management (Unchanged)
// ----------------------------------------------------

function updateCartCount() {
  const cart = loadCart();
  const count = cart.length;
  const cartCounters = document.querySelectorAll(".cart-count");
  cartCounters.forEach((counter) => {
    counter.textContent = count;
    counter.style.display = count > 0 ? "inline-block" : "none";
  });
}

function initServiceCardHovers() {
  const serviceCards = document.querySelectorAll(
    ".service-cards-grid a.service-card"
  );
  serviceCards.forEach((card) => {
    card.addEventListener("mouseover", function () {
      this.classList.add("hover-gradient");
    });
    card.addEventListener("mouseout", function () {
      this.classList.remove("hover-gradient");
    });
  });
}

// ----------------------------------------------------
// 3. CHECKOUT PAGE LOGIC (pages/checkout.html) (Unchanged)
// ----------------------------------------------------

function displayCheckoutSummary() {
  if (!document.getElementById("display-total")) return;

  const cart = loadCart();
  if (cart.length === 0) {
    return;
  }

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  const itemNames = cart.map((item) => item.name).join(", ");

  document.getElementById("display-total").textContent = total.toLocaleString();
  document
    .getElementById("order-summary")
    .querySelector("p:last-child").textContent = `(Items: ${itemNames})`;

  document.getElementById("hidden-total").value = total;
  document.getElementById("hidden-items").value = itemNames;
}

// ----------------------------------------------------
// 4. AI DIAGNOSIS LOGIC (For pages/diagnosis.html)
// ----------------------------------------------------

/**
 * Resizes and compresses an image file to a max width for stable mobile upload.
 */
function compressImage(file, maxWidth = 1024, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height; // Calculate new dimensions based on maxWidth constraint

        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height; // Draw the resized image onto the canvas

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height); // Convert the canvas content to a compressed JPEG data URL

        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };

      img.onerror = () =>
        reject(new Error("Error loading image for compression."));
    };

    reader.onerror = () =>
      reject(new Error("Error reading file for compression."));
  });
}

/**
 * Helper to show only one phase of the diagnosis process.
 */
function showPhase(phaseName) {
  const phases = [cameraContainer, scanProcessing];
  phases.forEach((phase) => {
    if (phase) {
      phase.style.display = phase.id === phaseName ? "flex" : "none";
    }
  });
}

// --- CORE CAMERA/UPLOAD LOGIC ---

function stopCamera() {
  if (videoStream) {
    videoStream.getTracks().forEach((track) => track.stop());
    videoStream = null;
    if (cameraFeed) cameraFeed.srcObject = null;
  }
  if (cameraPlaceholder) cameraPlaceholder.style.display = "flex";
  if (cameraFeed) cameraFeed.style.display = "none";
  if (captureButton) captureButton.style.display = "none";
}

async function startCamera() {
  try {
    stopCamera();
    const constraints = { video: { facingMode: "environment" } };
    videoStream = await navigator.mediaDevices.getUserMedia(constraints);

    if (cameraFeed) {
      cameraFeed.srcObject = videoStream;
      cameraFeed.style.display = "block";
      cameraPlaceholder.style.display = "none";
      captureButton.style.display = "block";
      await cameraFeed.play();
    }
  } catch (err) {
    console.error("Error accessing camera: ", err);
    alert(
      "Cannot access camera. Please check permissions or try uploading a photo."
    );
    stopCamera();
  }
}

function capturePhoto() {
  if (!videoStream || !resultCanvas) return;

  resultCanvas.width = cameraFeed.videoWidth;
  resultCanvas.height = cameraFeed.videoHeight;

  const ctx = resultCanvas.getContext("2d");
  ctx.drawImage(cameraFeed, 0, 0, resultCanvas.width, resultCanvas.height);

  const imageDataURL = resultCanvas.toDataURL("image/jpeg");

  stopCamera();

  processDiagnosis(imageDataURL);
}

// --- FILE UPLOAD HANDLER ---
async function handleFileUpload(event) {
  const file = event.target.files[0];

  if (file && file.type.startsWith("image/")) {
    stopCamera();
    showPhase("scan-processing");

    try {
      // Re-enables the compression function
      const compressedDataURL = await compressImage(file);
      processDiagnosis(compressedDataURL);
    } catch (e) {
      console.error("Error reading or compressing file:", e);
      alert(
        "Error reading file or file is too large. Please try a different image."
      );
      showPhase("camera-container"); // Go back to camera view on failure
    }
  } else if (file) {
    alert("Please upload a valid image file.");
  }
  if (event.target) {
    event.target.value = null;
  }
}

// --- API CONNECTION AND RESULT REDIRECTION ---

/**
 * Initiates the diagnosis process by sending Data URL to the backend.
 */
function processDiagnosis(imageDataURL) {
  // showPhase("scan-processing"); // Already done in handleFileUpload/capturePhoto
  localStorage.setItem("scannedImageURL", imageDataURL);

  callGeminiApi(imageDataURL);
}

async function callGeminiApi(imageDataURL) {
  const userPrompt =
    "Analyze this image of a plant leaf or part. Provide a clear, concise diagnosis, cause, confidence, and treatment plan for a local farmer in Sierra Leone."; // *** FIX 4: Use AbortController for reliable timeout ***

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageDataURL: imageDataURL,
        prompt: userPrompt,
      }),
      signal: controller.signal, // Pass the signal to the fetch request
    });

    clearTimeout(timeoutId); // Clear timeout on successful connection

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Server error: Check Node.js console" }));
      throw new Error(
        `Server Status Error: ${response.status} - ${
          errorData.error || "Unknown server issue"
        }`
      );
    }

    const data = await response.json(); // Store the structured diagnosis result and redirect

    localStorage.setItem("diagnosisResult", JSON.stringify(data));
    // The image data URL is now stored in the diagnosisResult for display
    window.location.href = "result.html";
  } catch (error) {
    clearTimeout(timeoutId); // Ensure timeout is cleared on any error

    console.error("Diagnosis Failed:", error);
    let errorMessage = `The server or AI connection failed. (Error: ${error.message})`;
    if (error.name === "AbortError") {
      errorMessage =
        "The diagnosis timed out. Your connection may be too slow, or the server is unresponsive.";
    } // ERROR FALLBACK: Store error and redirect

    // This error structure must match the Gemini response structure
    const errorData = {
      plant_name: "Diagnosis Failed",
      health_status: "Error",
      disease: "Connection/Processing Failure",
      confidence: "Low",
      cause: errorMessage, // Matches the new 'cause' field
      treatment_steps: [
        // Matches the new 'treatment_steps' field
        "1. Ensure your backend function is deployed correctly.",
        "2. Check Netlify function logs for API key errors.",
        "3. If using mobile data, try a faster network (Wi-Fi).",
        "4. Try uploading a different photo.",
      ],
      recommendation_summary:
        "A connection or processing issue prevented the diagnosis. See details below.",
      status_class: "status-unhealthy",
      // Include fallback audio keys for error state
      disease_audio_key: "error",
      summary_audio_key: "try-again",
    };
    localStorage.setItem("diagnosisResult", JSON.stringify(errorData));
    window.location.href = "result.html";
  }
}

// ----------------------------------------------------
// 5. RESULT PAGE LOGIC (NEW SECTION for pages/result.html)
// ----------------------------------------------------

// --- NEW AUDIO PLAYBACK LOGIC ---

/**
 * 1. Function to play a single audio file and return a Promise
 */
function playAudioClip(key) {
  return new Promise((resolve) => {
    // Construct the full path to the MP3 file using the key
    const audioPath = `/audio/${key}.mp3`;
    const audio = new Audio(audioPath);

    // Event listener to know when the audio finishes playing
    audio.onended = () => {
      console.log(`Finished playing: ${key}`);
      resolve(); // Allows the sequence to move to the next step
    };

    // Handle errors if the file can't be found (e.g., key mismatch or file missing)
    audio.onerror = (e) => {
      console.error(`Error loading or playing audio file: ${audioPath}`, e);
      // Alert the user and resolve to keep the sequence from getting stuck
      alert(
        `Error: Krio audio file not found for key: ${key}. Check the /audio/ folder.`
      );
      resolve();
    };

    console.log(`Playing audio: ${audioPath}`);
    audio.play().catch((error) => {
      // Catch error if the browser prevents auto-play without user interaction
      console.error("Autoplay failed:", error);
      // Alerting the user to press again is often required on mobile.
      alert(
        "Audio requires a single tap to start. Please tap the button again."
      );
      resolve();
    });
  });
}

/**
 * Ensures the correct audio key is selected, substituting 'none' or missing keys
 * with the appropriate 'healthy' key if the diagnosis is healthy.
 */
function getSanitizedAudioKeys(diagnosisData) {
  let diseaseKey = diagnosisData.disease_audio_key || "";
  let summaryKey = diagnosisData.summary_audio_key || "continue-good-practices"; // Fallback for summary

  // FIX: If the diagnosis is healthy, force the disease key to 'healthy'
  // to avoid looking for 'none.mp3' or a missing key.
  if (
    diagnosisData.health_status &&
    diagnosisData.health_status.toLowerCase() === "healthy"
  ) {
    diseaseKey = "healthy";
  }

  // Ensure the summary key is set for the 'Healthy' path, as seen in the screenshot error
  if (!summaryKey || summaryKey === "try-again") {
    summaryKey = "continue-good-practices";
  }

  return { diseaseKey, summaryKey };
}

/**
 * Main function to chain the two clips together
 */
async function playFullKrioDiagnosis(diagnosisData) {
  const button = document.getElementById("listen-krio-btn");
  if (!button) return;

  // Use the helper to get reliable keys, fixing the "None" issue
  const { diseaseKey, summaryKey } = getSanitizedAudioKeys(diagnosisData);

  if (!diseaseKey) {
    alert("Fatal Audio Error: Could not determine the primary audio key.");
    return;
  }

  // Disable button to prevent re-press while playing
  button.disabled = true;
  button.textContent = "🔊 Playing...";

  try {
    // 1. Play the Primary Clip (Healthy or Disease)
    await playAudioClip(diseaseKey);

    // Wait for 500 milliseconds (half a second pause between clips)
    await new Promise((r) => setTimeout(r, 500));

    // 2. Play the Summary Action Clip (What to Do)
    await playAudioClip(summaryKey);
  } catch (e) {
    console.error("Error during playback chain:", e);
  }

  // Re-enable button after both clips finish (or an error occurs)
  button.disabled = false;
  button.innerHTML = '<i class="fas fa-volume-up"></i> Listen in Krio';
}
// --- END NEW AUDIO PLAYBACK LOGIC ---

/**
 * Displays the diagnosis results on result.html using data from localStorage.
 */
function displayDiagnosisResult() {
  const resultJson = localStorage.getItem("diagnosisResult");
  const imageURL = localStorage.getItem("scannedImageURL");

  if (!resultJson) {
    // Fallback if no result data is found
    document.querySelector(".result-page-container").innerHTML =
      "<h1>Error Loading Results</h1><p>Please return to the diagnosis page and try again.</p>";
    return;
  }

  const data = JSON.parse(resultJson);

  // --- 1. Header and Status ---
  const headerElement = document.getElementById("diagnosis-header-text");
  const statusIndicator = document.getElementById("status-indicator-dot");

  if (headerElement)
    headerElement.textContent = `Diagnosis Complete: ${
      data.health_status && data.health_status.toLowerCase() === "healthy"
        ? "Healthy!"
        : "Sickness Found"
    }`;
  if (statusIndicator) {
    statusIndicator.className =
      "status-indicator " + (data.status_class || "status-unhealthy");
  }

  // --- 2. Scanned Image ---
  const scannedImage = document.getElementById("scanned-plant-image");
  if (scannedImage && imageURL) {
    scannedImage.src = imageURL;
  }

  // --- 3. Result Details ---
  if (document.getElementById("plant-identified"))
    document.getElementById("plant-identified").textContent = data.plant_name;
  if (document.getElementById("result-disease-name"))
    document.getElementById("result-disease-name").textContent = data.disease;
  if (document.getElementById("result-health-status"))
    document.getElementById("result-health-status").textContent =
      data.health_status;
  if (document.getElementById("result-confidence"))
    document.getElementById("result-confidence").textContent = data.confidence;

  // --- 4. Cause (New Field) ---
  const causeText = document.getElementById("diagnosis-cause-text");
  if (causeText) {
    causeText.textContent =
      data.cause || "No specific cause information available.";
  }

  // --- 5. Treatment Steps (New Field) ---
  const treatmentList = document.getElementById("treatment-plan-list");
  if (treatmentList && Array.isArray(data.treatment_steps)) {
    treatmentList.innerHTML = "";
    data.treatment_steps.forEach((step, index) => {
      // Note: If you want numbered steps, use an <ol> in HTML and <li> here
      const listItem = document.createElement("li");
      listItem.textContent = step.replace(/^\d+\.\s*/, ""); // Remove leading numbers if present
      treatmentList.appendChild(listItem);
    });
  }

  // --- 6. Farmer Summary & Audio Setup (Krio Feature) ---
  const farmerSummary = document.getElementById("farmer-summary-text");
  if (farmerSummary) {
    farmerSummary.textContent = data.recommendation_summary;
  }

  // Attach Krio Audio Listeners
  const listenKrioBtn = document.getElementById("listen-krio-btn");
  if (listenKrioBtn) {
    // *** MODIFICATION HERE ***: Call the new chaining function on click
    listenKrioBtn.onclick = () => playFullKrioDiagnosis(data);
  }

  // Optional: If you have a separate button for the summary audio, use summary_audio_key here.
}

// ----------------------------------------------------
// 6. Initialisation and Event Listeners (CONSOLIDATED)
// ----------------------------------------------------

function initializeScanFeature() {
  // Initial State: Show default camera container
  showPhase("camera-container");
  stopCamera(); // A. Start Camera Button Listener

  if (startCameraButton) {
    startCameraButton.addEventListener("click", startCamera);
  } // B. Capture Button Listener

  if (captureButton) {
    captureButton.addEventListener("click", capturePhoto);
  } // C. Upload Photo Button (Triggers the hidden file input)

  if (uploadPhotoButton) {
    uploadPhotoButton.addEventListener("click", () => {
      if (fileUploadInput) {
        fileUploadInput.click();
      }
    });
  } // D. File Input Change Listener

  if (fileUploadInput) {
    fileUploadInput.addEventListener("change", handleFileUpload);
  } // E. Finish Scan Button (For use on the result.html if needed)

  if (finishScanButton) {
    finishScanButton.addEventListener("click", () => {
      // Assuming this redirects back to diagnosis.html
      window.location.href = "diagnosis.html";
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // General UX
  updateCartCount();
  initServiceCardHovers(); // E-commerce: Attach click listeners to all "Buy Now" buttons

  document
    .querySelectorAll(".product-card .add-to-cart-btn")
    .forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const name = button.dataset.name;
        const price = parseInt(button.dataset.price);

        if (name && !isNaN(price)) {
          addItemToCartAndCheckout(name, price);
        } else {
          console.error("Missing data attributes on Buy Now button.");
          alert("Error: Product data missing. Cannot add to cart.");
        }
      });
    }); // Checkout Page

  displayCheckoutSummary();

  // Check if we are on the result page to run the display logic
  if (window.location.pathname.includes("result.html")) {
    displayDiagnosisResult();
  }

  // Diagnosis Page: Initialize the core scan features
  if (cameraContainer) {
    initializeScanFeature();
  }
});
