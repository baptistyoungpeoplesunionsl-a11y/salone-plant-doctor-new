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
// FINAL_PROJECT/script.js

// ----------------------------------------------------
// 1. E-COMMERCE: Local Storage Cart Management
// ----------------------------------------------------

const CART_STORAGE_KEY = "salonePlantDoctorCart";

/**
 * Loads the current cart from Local Storage.
 * @returns {Array} The cart array or an empty array if none exists.
 */
function loadCart() {
  const cartJson = localStorage.getItem(CART_STORAGE_KEY);
  return cartJson ? JSON.parse(cartJson) : [];
}

/**
 * Saves the current cart array to Local Storage.
 * @param {Array} cart - The cart array to save.
 */
function saveCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  updateCartCount();
}

/**
 * Adds an item to the cart and redirects to checkout.
 * This is a simplified function for our manual OM checkout.
 * @param {string} name - Product name.
 * @param {number} price - Product price (in Leones).
 */
function addItemToCartAndCheckout(name, price) {
  // 1. Clear the old cart (since we only support one item per manual checkout for now)
  const cart = [{ name, price }];

  // 2. Save the new cart
  saveCart(cart);

  // 3. Alert user (for feedback) and redirect
  alert(
    `Added ${name} (Le ${price.toLocaleString()}) to cart. Redirecting to Checkout.`
  );
  window.location.href = "./pages/checkout.html";
}

// ----------------------------------------------------
// 2. UX: Dynamic Header & Mobile Nav Management
// ----------------------------------------------------

/**
 * Updates the cart counter display in the header/mobile nav.
 */
function updateCartCount() {
  const cart = loadCart();
  const count = cart.length;

  // Assuming you have an element with the class '.cart-count' in your header/mobile nav
  const cartCounters = document.querySelectorAll(".cart-count");
  cartCounters.forEach((counter) => {
    counter.textContent = count;
    counter.style.display = count > 0 ? "inline-block" : "none";
  });
}

// ----------------------------------------------------
// 3. CHECKOUT PAGE LOGIC (pages/checkout.html)
// ----------------------------------------------------

/**
 * Populates the order summary and calculates the total on the checkout page.
 */
function displayCheckoutSummary() {
  // Only run this function if we are on the checkout page
  if (!document.getElementById("display-total")) return;

  const cart = loadCart();
  if (cart.length === 0) {
    // If the cart is empty, redirect them back to the shop
    alert("Your cart is empty. Please add an item from the shop.");
    window.location.href = "./shop.html";
    return;
  }

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  const itemNames = cart.map((item) => item.name).join(", ");

  // Update the visual display
  document.getElementById("display-total").textContent = total.toLocaleString();
  document
    .getElementById("order-summary")
    .querySelector("p:last-child").textContent = `(Items: ${itemNames})`;
}

// ----------------------------------------------------
// 4. Initialization
// ----------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  // Update the cart count on every page load
  updateCartCount();

  // Initialize checkout summary (only runs on checkout.html)
  displayCheckoutSummary();

  // Attach click listeners to all "Buy Now" buttons on the shop page
  document
    .querySelectorAll(".product-card .add-to-cart-btn")
    .forEach((button) => {
      button.addEventListener("click", (event) => {
        // Prevent the default button action
        event.preventDefault();

        // Navigate up to the product card container
        const card = event.target.closest(".product-card");

        // Safely retrieve product details from the card
        const name = card.querySelector(".product-name").textContent;
        // Extract the price, assuming the format "Le 45,000"
        const priceText = card.querySelector(".product-price").textContent;
        const price = parseInt(
          priceText.replace("Le", "").replace(/,/g, "").trim()
        );

        // Add the item and redirect
        addItemToCartAndCheckout(name, price);
      });
    });
});
