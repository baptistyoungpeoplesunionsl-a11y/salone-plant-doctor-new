// script.js
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

const API_ENDPOINT = "http://localhost:3000/diagnose";

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
  window.location.href = "./pages/checkout.html";
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

// --- Helper function to convert File object to Data URL string ---
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- FILE UPLOAD HANDLER (FIXED) ---

async function handleFileUpload(event) {
  const file = event.target.files[0];

  if (file && file.type.startsWith("image/")) {
    stopCamera();

    try {
      const imageDataURL = await fileToBase64(file);
      processDiagnosis(imageDataURL);
    } catch (e) {
      console.error("Error reading file:", e);
      alert("Error reading file. Please try a different image.");
    }
  } else if (file) {
    alert("Please upload a valid image file.");
  }

  // CRITICAL FIX: Reset file input value to allow the 'change' event to fire reliably on the next click.
  if (event.target) {
    event.target.value = null;
  }
}

// --- API CONNECTION AND RESULT REDIRECTION ---

/**
 * Initiates the diagnosis process by sending Data URL to the backend.
 */
function processDiagnosis(imageDataURL) {
  showPhase("scan-processing");
  localStorage.setItem("scannedImageURL", imageDataURL);

  callGeminiApi(imageDataURL);
}

async function callGeminiApi(imageDataURL) {
  const userPrompt =
    "Analyze this image of a plant leaf or part. Provide a clear, concise diagnosis, cause, confidence, and treatment plan for a local farmer in Sierra Leone.";

  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageDataURL: imageDataURL,
        prompt: userPrompt,
      }),
    });

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

    const data = await response.json();

    // Store the structured diagnosis result and redirect
    localStorage.setItem("diagnosisResult", JSON.stringify(data));
    window.location.href = "result.html";
  } catch (error) {
    console.error("Diagnosis Failed:", error);

    // ERROR FALLBACK: Store error and redirect
    const errorData = {
      plant_name: "Diagnosis Failed",
      health_status: "Error",
      disease: "Connection/API Failure",
      confidence: "Low",
      cause: `The server or AI connection failed. Check your Node.js console. (Error: ${error.message})`,
      treatment_steps: [
        "Ensure server is running",
        "Check API key",
        "Try again",
      ],
      recommendation_summary:
        "Please check your system configuration immediately.",
      status_class: "status-unhealthy",
    };
    localStorage.setItem("diagnosisResult", JSON.stringify(errorData));
    window.location.href = "result.html";
  }
}

// ----------------------------------------------------
// 5. Initialisation and Event Listeners (CONSOLIDATED)
// ----------------------------------------------------

function initializeScanFeature() {
  // Initial State: Show default camera container
  showPhase("camera-container");
  stopCamera();

  // A. Start Camera Button Listener
  if (startCameraButton) {
    startCameraButton.addEventListener("click", startCamera);
  }

  // B. Capture Button Listener
  if (captureButton) {
    captureButton.addEventListener("click", capturePhoto);
  }

  // C. Upload Photo Button (Triggers the hidden file input)
  if (uploadPhotoButton) {
    uploadPhotoButton.addEventListener("click", () => {
      if (fileUploadInput) {
        fileUploadInput.click();
      }
    });
  }

  // D. File Input Change Listener
  if (fileUploadInput) {
    fileUploadInput.addEventListener("change", handleFileUpload);
  }

  // E. Finish Scan Button (For use on the result.html if needed)
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
  initServiceCardHovers();

  // E-commerce: Attach click listeners to all "Buy Now" buttons
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
    });

  // Checkout Page
  displayCheckoutSummary();

  // Diagnosis Page: Initialize the core scan features
  // Check for the presence of diagnosis elements before initializing
  if (cameraContainer) {
    initializeScanFeature();
  }
});
