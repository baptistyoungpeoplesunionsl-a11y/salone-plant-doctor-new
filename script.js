// Get the main scan buttons
const heroScanBtn = document.querySelector(".get-started-btn");
const mainCtaBar = document.querySelector(".main-cta-bar");
const mobileScanBtn = document.querySelector(".scan-diagnos-btn");

/**
 * Function to handle the scan action (simulated camera/file upload)
 */
function handleScanAction() {
  alert(
    "Initiating Plant Scan! A file upload dialog or camera access request would appear here to analyze your plant photo."
  );
  // In a production environment, this would trigger the AI model or API call.
}

// Add event listeners to all main scan entry points
if (heroScanBtn) {
  heroScanBtn.addEventListener("click", handleScanAction);
}
if (mainCtaBar) {
  mainCtaBar.addEventListener("click", handleScanAction);
}
if (mobileScanBtn) {
  mobileScanBtn.addEventListener("click", handleScanAction);
}

// --- Mobile Navigation Tab Simulation ---

const navButtons = document.querySelectorAll("#mobile-nav button");

navButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    // Handle the visual 'active' state
    navButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    const targetView = button.getAttribute("data-target");
    console.log(`Navigating to: ${targetView}`);

    // Simulating the navigation by scrolling to the top (or to a specific section)
    if (targetView !== "scan") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      // In a real SPA, we would load the content for 'home', 'history', etc.
    } else {
      // If 'scan', trigger the diagnosis function
      handleScanAction();
    }
  });
});
// Function to add the green gradient hover effect to service cards
function initServiceCardHovers() {
  // 1. Select all service card links
  const serviceCards = document.querySelectorAll(
    ".service-cards-grid a.service-card"
  );

  // 2. Loop through each card and attach listeners
  serviceCards.forEach((card) => {
    // Add the class when the cursor enters the card
    card.addEventListener("mouseover", function () {
      // Use this.classList.add to target the specific card being hovered
      this.classList.add("hover-gradient");
    });

    // Remove the class when the cursor leaves the card
    card.addEventListener("mouseout", function () {
      // Use this.classList.remove to target the specific card being hovered
      this.classList.remove("hover-gradient");
    });
  });
}

// 3. Call the function when the page loads
// This ensures the code runs only after all HTML elements are available
document.addEventListener("DOMContentLoaded", initServiceCardHovers);
// Function to add the green gradient hover effect to service cards
function initServiceCardHovers() {
  // Select all service card links
  const serviceCards = document.querySelectorAll(
    ".service-cards-grid a.service-card"
  );

  // Loop through each card and attach listeners
  serviceCards.forEach((card) => {
    // Add the class when the cursor enters the card
    card.addEventListener("mouseover", function () {
      this.classList.add("hover-gradient");
    });

    // Remove the class when the cursor leaves the card
    card.addEventListener("mouseout", function () {
      this.classList.remove("hover-gradient");
    });
  });
}

// Call the function when the page loads
document.addEventListener("DOMContentLoaded", initServiceCardHovers);
