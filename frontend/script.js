/**
 * PawMatch — Core Application Client
 * Connects to the Express REST API with multi-shelter isolation,
 * real animal photography, adoption flows, and shelter dashboard.
 */

// API Configuration
const DEFAULT_API = "http://localhost:5000/api";
let API_BASE = localStorage.getItem("pawmatch_api_url") || DEFAULT_API;

// State Store
const state = {
  user: null,
  token: null,
  allPets: [],
  selectedSpecies: "all",
  currentPet: null,
  currentShelter: null,
  currentTab: "applications"
};

// Curated Real Animal Photography Collections (High Quality Unsplash CDN)
const REAL_PHOTOS = {
  Dog: [
    "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80", // Golden Retriever
    "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80", // Playful Dog
    "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=80", // Cute dog portrait
    "https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=800&q=80", // Running dog
    "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=800&q=80", // Beagle pup
    "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=800&q=80", // Two happy dogs
    "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=800&q=80", // Bulldog
    "https://images.unsplash.com/photo-1561037404-61cd46aa615b?auto=format&fit=crop&w=800&q=80"  // Husky
  ],
  Cat: [
    "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80", // Ginger Cat
    "https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=800&q=80", // British Shorthair
    "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?auto=format&fit=crop&w=800&q=80", // Curious cat
    "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=800&q=80", // Cool cat
    "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=800&q=80", // Tabby cat
    "https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?auto=format&fit=crop&w=800&q=80"  // Fluffy cat
  ],
  Rabbit: [
    "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=800&q=80", // White Lop Rabbit
    "https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?auto=format&fit=crop&w=800&q=80", // Bunny in grass
    "https://images.unsplash.com/photo-1576707064472-23967a8777b3?auto=format&fit=crop&w=800&q=80"  // Brown bunny
  ],
  Bird: [
    "https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&w=800&q=80", // Tropical Parakeet
    "https://images.unsplash.com/photo-1444464666168-49d633b86797?auto=format&fit=crop&w=800&q=80", // Colorful bird
    "https://images.unsplash.com/photo-1551085254-e96b210df58a?auto=format&fit=crop&w=800&q=80"  // Cockatiel
  ],
  Other: [
    "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80"
  ]
};

// Global Application Registry Key in LocalStorage for Cross-Tab / Cross-Role Sync
const APPS_STORAGE_KEY = "pawmatch_global_applications_registry";

/* ==========================================================================
   AUTHENTICATION & STORAGE HELPERS
   ========================================================================== */
function getToken() {
  return localStorage.getItem("pawmatch_token");
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("pawmatch_user") || "null");
  } catch (e) {
    return null;
  }
}

function saveAuth(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem("pawmatch_token", token);
  localStorage.setItem("pawmatch_user", JSON.stringify(user));
  updateNavState();
}

function clearAuth() {
  state.token = null;
  state.user = null;
  state.currentShelter = null;
  localStorage.removeItem("pawmatch_token");
  localStorage.removeItem("pawmatch_user");
  updateNavState();
}

function authHeaders() {
  const t = getToken();
  return {
    "Content-Type": "application/json",
    ...(t ? { "Authorization": `Bearer ${t}` } : {})
  };
}

/* ==========================================================================
   TOAST ALERTS & UI UTILITIES
   ========================================================================== */
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type === "error" ? "toast-error" : "toast-success"}`;
  toast.innerHTML = `
    <span>${type === "error" ? "✕" : "✓"}</span>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}

// Deterministic Real Photo Picker based on species, breed, and pet name
function getPetPhoto(pet) {
  if (pet.imageUrl && pet.imageUrl.startsWith("http")) {
    return pet.imageUrl;
  }
  const species = pet.species || "Dog";
  const pool = REAL_PHOTOS[species] || REAL_PHOTOS.Dog;
  
  // Hash name and breed to select a consistent real photo from the pool
  const str = `${pet.name || ""}-${pet.breed || ""}-${pet._id || ""}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % pool.length;
  return pool[index];
}

/* ==========================================================================
   REST API CLIENT
   ========================================================================== */
async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...authHeaders(),
        ...(options.headers || {})
      }
    });

    let data = {};
    try {
      data = await response.json();
    } catch (e) {
      // response without json body
    }

    if (!response.ok) {
      const errMsg = data.message || data.error || `HTTP error ${response.status}`;
      throw new Error(errMsg);
    }

    return data;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

// Ping API to update live status dot
async function checkApiHealth() {
  const dot = document.getElementById("api-dot");
  const label = document.getElementById("api-name");
  try {
    const res = await fetch(`${API_BASE}/pets`, { method: "GET" });
    if (res.ok) {
      if (dot) dot.className = "api-dot online";
      if (label) label.textContent = API_BASE.includes("localhost") ? "Local :5000" : "Render API";
      return true;
    }
  } catch (e) {
    if (dot) dot.className = "api-dot offline";
    if (label) label.textContent = "Offline";
  }
  return false;
}

/* ==========================================================================
   MULTI-SHELTER EMAIL ISOLATION & SHELTER REGISTRY
   ========================================================================== */
function getShelterKey(email) {
  return `pawmatch_shelter_${String(email || "").toLowerCase().trim()}`;
}

// Loads or associates the shelter profile for the logged in shelter user
async function loadShelterForUser(user) {
  if (!user || user.role !== "shelter") return null;

  const key = getShelterKey(user.email);
  let localShelter = null;
  try {
    localShelter = JSON.parse(localStorage.getItem(key) || "null");
  } catch (e) {}

  if (localShelter && localShelter._id) {
    state.currentShelter = localShelter;
    return localShelter;
  }

  // If no shelter record exists yet in localStorage for this email,
  // check if one was saved in master shelter registry
  const registry = getRegisteredShelters();
  const found = registry.find(s => s.email && s.email.toLowerCase() === user.email.toLowerCase());
  if (found) {
    state.currentShelter = found;
    localStorage.setItem(key, JSON.stringify(found));
    return found;
  }

  // Otherwise, user needs to create their shelter organization profile
  state.currentShelter = null;
  return null;
}

function getRegisteredShelters() {
  try {
    return JSON.parse(localStorage.getItem("pawmatch_shelters_master_list") || "[]");
  } catch (e) {
    return [];
  }
}

function registerShelterLocally(shelter) {
  const list = getRegisteredShelters();
  const idx = list.findIndex(s => s._id === shelter._id || s.email === shelter.email);
  if (idx >= 0) {
    list[idx] = shelter;
  } else {
    list.push(shelter);
  }
  localStorage.setItem("pawmatch_shelters_master_list", JSON.stringify(list));
}

// Handle Shelter Profile Creation via POST /api/shelters
async function handleCreateShelterProfile(event) {
  event.preventDefault();
  const user = getUser();
  if (!user || user.role !== "shelter") {
    showToast("Shelter authentication required.", "error");
    return;
  }

  const name = document.getElementById("shelter-setup-name").value.trim();
  const email = document.getElementById("shelter-setup-email").value.trim();
  const address = document.getElementById("shelter-setup-address").value.trim();
  const phone = document.getElementById("shelter-setup-phone").value.trim();

  try {
    const res = await fetchApi("/shelters", {
      method: "POST",
      body: JSON.stringify({ name, email, address, phone })
    });

    const createdShelter = res.shelter || {
      _id: "shelter_" + Date.now(),
      name,
      email,
      address,
      phone
    };

    // Save under this shelter email
    const key = getShelterKey(user.email);
    localStorage.setItem(key, JSON.stringify(createdShelter));
    registerShelterLocally(createdShelter);
    state.currentShelter = createdShelter;

    showToast("Shelter organization registered successfully!");
    renderDashboard();
  } catch (err) {
    showToast(err.message, "error");
  }
}

/* ==========================================================================
   GLOBAL ADOPTION APPLICATIONS REGISTRY (Cross-Role Sync)
   ========================================================================== */
function getGlobalApplications() {
  try {
    return JSON.parse(localStorage.getItem(APPS_STORAGE_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function saveGlobalApplication(appRecord) {
  const apps = getGlobalApplications();
  const existingIndex = apps.findIndex(a => a._id === appRecord._id);
  if (existingIndex >= 0) {
    apps[existingIndex] = { ...apps[existingIndex], ...appRecord };
  } else {
    apps.unshift(appRecord);
  }
  localStorage.setItem(APPS_STORAGE_KEY, JSON.stringify(apps));
}

function updateApplicationStatusInRegistry(appId, newStatus) {
  const apps = getGlobalApplications();
  const targetId = String(appId || "").trim();
  let found = false;

  apps.forEach(a => {
    const currentId = String(a._id || a.id || "").trim();
    if (currentId && currentId === targetId) {
      a.status = newStatus;
      a.updatedAt = new Date().toISOString();
      found = true;
    }
  });

  if (!found && targetId) {
    apps.unshift({
      _id: targetId,
      status: newStatus,
      updatedAt: new Date().toISOString()
    });
  }

  localStorage.setItem(APPS_STORAGE_KEY, JSON.stringify(apps));
}

/* ==========================================================================
   ROUTING & PAGE MANAGEMENT
   ========================================================================== */
function navigateTo(route) {
  const target = `#${route}`;
  if (location.hash === target) {
    handleHashChange();
  } else {
    location.hash = target;
  }
}

async function handleHashChange() {
  const user = getUser();
  const token = getToken();
  let hash = location.hash.replace("#", "").trim();

  // If user is authenticated, redirect away from landing/auth pages to their workspace
  if (user && token) {
    if (!hash || hash === "home" || hash === "login" || hash === "register") {
      hash = "dashboard";
      if (location.hash !== "#dashboard") {
        history.replaceState(null, "", "#dashboard");
      }
    }
  } else {
    // If guest/unauthenticated user tries to access private views, redirect to login
    if (hash === "dashboard" || hash === "my-applications") {
      hash = "login";
      history.replaceState(null, "", "#login");
    } else if (!hash) {
      hash = "home";
    }
  }

  if (hash.startsWith("pet/")) {
    const petId = hash.split("/")[1];
    showPage("pet-detail");
    loadPetDetail(petId);
    return;
  }

  if (hash.startsWith("apply/")) {
    const petId = hash.split("/")[1];
    showPage("apply");
    prepareApplyPage(petId);
    return;
  }

  const validPages = ["home", "pets", "pet-detail", "login", "register", "dashboard", "apply", "my-applications"];
  if (!validPages.includes(hash)) {
    hash = user && token ? "dashboard" : "home";
  }

  showPage(hash);

  if (hash === "home") {
    loadHomeStats();
  } else if (hash === "pets") {
    loadPets();
  } else if (hash === "dashboard") {
    renderDashboard();
  } else if (hash === "my-applications") {
    loadMyApplications();
  }

  updateNavState();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => {
    p.classList.toggle("hidden", p.dataset.page !== pageId);
  });

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.route === pageId);
  });
}

function updateNavState() {
  const user = getUser();
  const token = getToken();
  const loggedOutWrap = document.getElementById("nav-auth-logged-out");
  const loggedInWrap = document.getElementById("nav-auth-logged-in");
  const myAppsLink = document.getElementById("nav-my-apps-link");
  const dashLink = document.getElementById("nav-dashboard-link");
  const homeLink = document.getElementById("nav-home-link");
  const brandLogo = document.getElementById("nav-brand-logo");

  if (user && token) {
    if (loggedOutWrap) loggedOutWrap.classList.add("hidden");
    if (loggedInWrap) loggedInWrap.classList.remove("hidden");
    if (homeLink) homeLink.classList.add("hidden");
    if (brandLogo) brandLogo.href = "#dashboard";

    document.getElementById("nav-user-name").textContent = user.name || user.email;
    document.getElementById("nav-user-role").textContent = user.role || "adopter";
    document.getElementById("nav-user-avatar").textContent = (user.name || user.email || "U")[0].toUpperCase();

    if (user.role === "adopter") {
      if (myAppsLink) myAppsLink.classList.remove("hidden");
      if (dashLink) {
        dashLink.textContent = "Dashboard";
        dashLink.classList.remove("hidden");
      }
    } else {
      if (myAppsLink) myAppsLink.classList.add("hidden");
      if (dashLink) {
        dashLink.textContent = "Shelter Portal";
        dashLink.classList.remove("hidden");
      }
    }
  } else {
    if (loggedOutWrap) loggedOutWrap.classList.remove("hidden");
    if (loggedInWrap) loggedInWrap.classList.add("hidden");
    if (myAppsLink) myAppsLink.classList.add("hidden");
    if (dashLink) dashLink.classList.add("hidden");
    if (homeLink) homeLink.classList.remove("hidden");
    if (brandLogo) brandLogo.href = "#home";
  }
}

/* ==========================================================================
   VIEW 1: HOME PAGE
   ========================================================================== */
async function loadHomeStats() {
  try {
    const data = await fetchApi("/pets");
    const pets = data.pets || [];
    document.getElementById("home-pet-count").textContent = pets.length;
  } catch (e) {
    document.getElementById("home-pet-count").textContent = "12+";
  }
}

/* ==========================================================================
   VIEW 2: BROWSE & FILTER PETS
   ========================================================================== */
async function loadPets(searchKeyword = "") {
  const grid = document.getElementById("pets-grid");
  if (!grid) return;

  grid.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
      <p>Loading available pets from verified shelters...</p>
    </div>
  `;

  try {
    let endpoint = "/pets";
    if (searchKeyword) {
      endpoint = `/pets/search?keyword=${encodeURIComponent(searchKeyword)}`;
    }

    const data = await fetchApi(endpoint);
    state.allPets = Array.isArray(data) ? data : (data.pets || []);

    filterAndRenderPets();
  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <span class="empty-icon">⚠️</span>
        <h3>Could not connect to backend</h3>
        <p>${escapeHtml(err.message)}</p>
        <button class="btn btn-outline mt-2" onclick="loadPets()">Retry Connection</button>
      </div>
    `;
  }
}

function filterAndRenderPets() {
  const grid = document.getElementById("pets-grid");
  const resultsSubtitle = document.getElementById("pets-results-subtitle");

  let filtered = state.allPets;

  if (state.selectedSpecies !== "all") {
    filtered = filtered.filter(p => (p.species || "").toLowerCase() === state.selectedSpecies.toLowerCase());
  }

  if (resultsSubtitle) {
    resultsSubtitle.textContent = `Showing ${filtered.length} available ${state.selectedSpecies === "all" ? "pets" : state.selectedSpecies + "s"}`;
  }

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <span class="empty-icon">🐾</span>
        <h3>No pets found</h3>
        <p>No available pets matched this filter. Try selecting another species or clearing your search.</p>
        <button class="btn btn-primary mt-2" onclick="resetPetFilters()">Reset Filters</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(pet => {
    const photo = getPetPhoto(pet);
    const petId = pet._id;
    return `
      <article class="pet-card">
        <div class="pet-card-image-wrap">
          <img src="${escapeHtml(photo)}" alt="${escapeHtml(pet.name)}" class="pet-card-image" loading="lazy">
          <span class="pet-card-species-badge">${escapeHtml(pet.species || "Pet")}</span>
        </div>
        <div class="pet-card-body">
          <div class="pet-card-header">
            <h3 class="pet-card-name">${escapeHtml(pet.name)}</h3>
            <span class="pet-card-gender">${escapeHtml(pet.gender || "Unknown")}</span>
          </div>
          <div class="pet-card-meta">
            ${escapeHtml(pet.breed || "Mixed Breed")} • ${escapeHtml(pet.age)} yrs old
          </div>
          <p class="pet-card-desc">${escapeHtml(pet.description || "Looking for a warm home and loving humans.")}</p>
          <div class="pet-card-footer">
            <span class="pet-shelter-mini" title="Shelter ID">🏠 Shelter Partner</span>
            <a href="#pet/${petId}" class="btn btn-outline btn-sm">View Details & Apply →</a>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function filterBySpecies(species, chipElement) {
  state.selectedSpecies = species;
  document.querySelectorAll(".species-chip").forEach(c => c.classList.remove("active"));
  if (chipElement) chipElement.classList.add("active");
  filterAndRenderPets();
}

function resetPetFilters() {
  state.selectedSpecies = "all";
  document.getElementById("pet-search-input").value = "";
  document.querySelectorAll(".species-chip").forEach(c => {
    c.classList.toggle("active", c.dataset.species === "all");
  });
  loadPets();
}

/* ==========================================================================
   VIEW 3: PET DETAIL VIEW
   ========================================================================== */
async function loadPetDetail(petId) {
  const container = document.getElementById("pet-detail-box");
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center; padding: 4rem 1rem;">
      <p class="text-muted">Loading pet details...</p>
    </div>
  `;

  try {
    const res = await fetchApi(`/pets/${petId}`);
    const pet = res.pet || res;
    state.currentPet = pet;

    const photo = getPetPhoto(pet);
    const user = getUser();
    const canApply = !user || user.role === "adopter";

    container.innerHTML = `
      <div class="detail-layout">
        <div class="detail-media">
          <img src="${escapeHtml(photo)}" alt="${escapeHtml(pet.name)}">
        </div>
        <div class="detail-info-pane">
          <div>
            <span class="eyebrow-text">Ready for Adoption</span>
            <div class="detail-header">
              <h1>${escapeHtml(pet.name)}</h1>
            </div>
            
            <div class="detail-pills-row">
              <span class="detail-pill">${escapeHtml(pet.species)}</span>
              <span class="detail-pill">${escapeHtml(pet.breed)}</span>
              <span class="detail-pill">${escapeHtml(pet.age)} Years Old</span>
              <span class="detail-pill">${escapeHtml(pet.gender)}</span>
            </div>

            <p class="detail-description">
              ${escapeHtml(pet.description || "This loving animal is ready to find their lifelong companion. Sheltered with utmost care, vaccinated, and awaiting your warm home.")}
            </p>

            <div class="detail-shelter-box">
              <span class="detail-shelter-icon">🏠</span>
              <div class="detail-shelter-meta">
                <strong>Verified Rescue Shelter</strong>
                <small>Shelter Reference ID: ${escapeHtml(pet.shelterId?._id || pet.shelterId || "Registered Shelter")}</small>
              </div>
            </div>
          </div>

          <div class="detail-actions-row">
            ${canApply ? `
              <a href="#apply/${pet._id}" class="btn btn-primary btn-lg">
                <span>Apply to Adopt ${escapeHtml(pet.name)}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              </a>
            ` : `
              <div class="alert alert-success">
                You are currently logged in with a Shelter Staff account. To submit adoption requests, please sign in as an Adopter.
              </div>
            `}
            <a href="#pets" class="btn btn-outline btn-lg">← Back to All Pets</a>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">⚠️</span>
        <h3>Could not load pet details</h3>
        <p>${escapeHtml(err.message)}</p>
        <a href="#pets" class="btn btn-primary mt-2">Return to Pets List</a>
      </div>
    `;
  }
}

/* ==========================================================================
   VIEW 4 & 5: LOGIN & REGISTER
   ========================================================================== */
async function handleLogin(event) {
  event.preventDefault();
  const alertBox = document.getElementById("login-error-alert");
  alertBox.classList.add("hidden");

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const submitBtn = document.getElementById("login-submit-btn");

  submitBtn.disabled = true;
  submitBtn.textContent = "Signing In...";

  try {
    const data = await fetchApi("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    saveAuth(data.token, data.user);
    showToast(`Welcome back, ${data.user.name || data.user.email}!`);

    // Navigate straight to dashboard
    navigateTo("dashboard");
  } catch (err) {
    alertBox.textContent = err.message || "Failed to log in. Please check your credentials.";
    alertBox.classList.remove("hidden");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<span>Sign In</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const alertBox = document.getElementById("register-error-alert");
  alertBox.classList.add("hidden");

  const name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;
  const role = document.querySelector('input[name="register-role"]:checked').value;
  const submitBtn = document.getElementById("register-submit-btn");

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating Account...";

  try {
    const data = await fetchApi("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role })
    });

    saveAuth(data.token, data.user);
    showToast(`Account created successfully as ${role}!`);

    // If registered as shelter, immediately auto-register the shelter profile or prompt
    if (role === "shelter") {
      try {
        const shelterRes = await fetchApi("/shelters", {
          method: "POST",
          body: JSON.stringify({
            name: name,
            email: email,
            address: "Main Shelter Headquarters",
            phone: "+1 555-0199"
          })
        });
        if (shelterRes.shelter) {
          const key = getShelterKey(email);
          localStorage.setItem(key, JSON.stringify(shelterRes.shelter));
          registerShelterLocally(shelterRes.shelter);
          state.currentShelter = shelterRes.shelter;
        }
      } catch (shelterErr) {
        console.log("Auto-shelter creation notice:", shelterErr.message);
      }
    }

    navigateTo("dashboard");
  } catch (err) {
    alertBox.textContent = err.message || "Failed to register account.";
    alertBox.classList.remove("hidden");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<span>Create Account</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
  }
}

function handleLogout() {
  clearAuth();
  showToast("Logged out successfully.");
  navigateTo("home");
}

/* ==========================================================================
   VIEW 6: DASHBOARD (MULTI-SHELTER EMAIL ISOLATION & ADOPTER VIEW)
   ========================================================================== */
async function renderDashboard() {
  const user = getUser();
  const wrapper = document.getElementById("dashboard-wrapper");
  if (!wrapper) return;

  if (!user || !getToken()) {
    wrapper.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🔒</span>
        <h3>Sign In Required</h3>
        <p>Please log in to access your personal dashboard and applications.</p>
        <div style="display:flex; gap:0.75rem; margin-top:1rem;">
          <a href="#login" class="btn btn-primary">Log In</a>
          <a href="#register" class="btn btn-outline">Create Account</a>
        </div>
      </div>
    `;
    return;
  }

  if (user.role === "shelter") {
    await renderShelterDashboard(user, wrapper);
  } else {
    await renderAdopterDashboard(user, wrapper);
  }
}

/* --------------------------------------------------------------------------
   SHELTER SPECIFIC DASHBOARD (ISOLATED BY SHELTER EMAIL)
   -------------------------------------------------------------------------- */
async function renderShelterDashboard(user, container) {
  container.innerHTML = `
    <div style="text-align: center; padding: 3rem 1rem;">
      <p class="text-muted">Loading workspace for ${escapeHtml(user.email)}...</p>
    </div>
  `;

  // 1. Fetch or associate the shelter record for this email
  let shelter = await loadShelterForUser(user);

  // If this email doesn't have an active shelter record, show the one-time registration form
  if (!shelter) {
    container.innerHTML = `
      <div class="dashboard-header-row">
        <div>
          <span class="eyebrow-text">Shelter Setup</span>
          <h1>Activate Shelter Workspace</h1>
          <p class="text-muted">Welcome, ${escapeHtml(user.name)}. Complete your shelter details to start managing pets and applications.</p>
        </div>
      </div>

      <div class="card auth-card" style="max-width: 650px; margin: 0 auto;">
        <h3 style="margin-bottom: 0.5rem;">Register Your Shelter Organization</h3>
        <p class="text-muted text-sm mb-3">These details will be attached to every pet and adoption application for this shelter email.</p>
        
        <form onsubmit="handleCreateShelterProfile(event)">
          <div class="form-row">
            <div class="form-group">
              <label for="shelter-setup-name">Shelter / Organization Name *</label>
              <input type="text" id="shelter-setup-name" required value="${escapeHtml(user.name || '')}" placeholder="e.g. City Paws Rescue">
            </div>
            <div class="form-group">
              <label for="shelter-setup-email">Contact Email (Bound to this account) *</label>
              <input type="email" id="shelter-setup-email" required readonly class="input-readonly" value="${escapeHtml(user.email)}">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="shelter-setup-address">Physical Address & City *</label>
              <input type="text" id="shelter-setup-address" required placeholder="e.g. 100 Rescue Lane, New York, NY">
            </div>
            <div class="form-group">
              <label for="shelter-setup-phone">Contact Phone Number</label>
              <input type="tel" id="shelter-setup-phone" placeholder="e.g. +1 555-0199">
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-block mt-2">
            <span>Complete Setup & Open Workspace</span>
          </button>
        </form>
      </div>
    `;
    return;
  }

  // 2. Load all pets from backend and filter by this shelter's _id
  let allPets = [];
  try {
    const petsRes = await fetchApi("/pets");
    allPets = petsRes.pets || [];
  } catch (e) {
    allPets = [];
  }

  const shelterPets = allPets.filter(p => {
    const pShelter = p.shelterId?._id || p.shelterId;
    return String(pShelter) === String(shelter._id);
  });

  // 3. Load applications for this shelter
  const allApps = getGlobalApplications();
  const currentShelterIdStr = String(shelter._id || shelter.id || "").trim();
  const currentShelterEmailStr = String(user.email || "").toLowerCase().trim();

  const incomingApps = allApps.filter(a => {
    const appShelterIdStr = String(a.shelterId?._id || a.shelterId || "").trim();
    const appShelterEmailStr = String(a.shelterEmail || "").toLowerCase().trim();

    return (currentShelterIdStr && appShelterIdStr === currentShelterIdStr) ||
           (appShelterEmailStr && appShelterEmailStr === currentShelterEmailStr) ||
           (!appShelterIdStr && !appShelterEmailStr);
  });

  const pendingCount = incomingApps.filter(a => (a.status || "pending") === "pending").length;
  const approvedCount = incomingApps.filter(a => a.status === "approved").length;

  container.innerHTML = `
    <!-- Top Header -->
    <div class="dashboard-header-row">
      <div>
        <span class="eyebrow-text">Shelter Workspace</span>
        <h1>Shelter Management Portal</h1>
        <p class="text-muted">Logged in as <strong>${escapeHtml(user.email)}</strong></p>
      </div>
      <div style="display:flex; gap:0.6rem;">
        <button class="btn btn-primary btn-sm" onclick="openAddPetModal()">+ List New Pet</button>
        <button class="btn btn-outline btn-sm" onclick="renderDashboard()">↻ Refresh</button>
      </div>
    </div>

    <!-- Shelter Identity Banner -->
    <div class="shelter-banner-card">
      <div class="shelter-banner-profile">
        <div class="shelter-banner-icon">🏢</div>
        <div class="shelter-banner-details">
          <h2>${escapeHtml(shelter.name)}</h2>
          <div class="shelter-banner-meta">
            <span>📍 ${escapeHtml(shelter.address || "Main Facility")}</span>
            ${shelter.phone ? `<span>📞 ${escapeHtml(shelter.phone)}</span>` : ""}
            <span class="shelter-id-tag" title="MongoDB Shelter ID">ID: ${escapeHtml(shelter._id)}</span>
          </div>
        </div>
      </div>
      <div class="shelter-banner-actions">
        <button class="btn btn-primary" onclick="openAddPetModal()">+ Add Pet</button>
      </div>
    </div>

    <!-- Metric Stat Cards -->
    <div class="stats-cards-grid">
      <div class="stat-metric-card">
        <div class="stat-metric-info">
          <small>Active Pet Listings</small>
          <strong>${shelterPets.length}</strong>
        </div>
        <div class="stat-metric-icon">🐾</div>
      </div>

      <div class="stat-metric-card">
        <div class="stat-metric-info">
          <small>Incoming Applications</small>
          <strong style="color:var(--status-pending);">${pendingCount} Pending</strong>
        </div>
        <div class="stat-metric-icon">📥</div>
      </div>

      <div class="stat-metric-card">
        <div class="stat-metric-info">
          <small>Approved Adoptions</small>
          <strong style="color:var(--status-approved);">${approvedCount}</strong>
        </div>
        <div class="stat-metric-icon">✓</div>
      </div>
    </div>

    <!-- Tabs Navigation -->
    <div class="dashboard-tabs">
      <button class="dash-tab-btn ${state.currentTab === 'applications' ? 'active' : ''}" onclick="switchShelterTab('applications')">
        <span>📥 Incoming Applications</span>
        <span class="tab-badge">${incomingApps.length}</span>
      </button>
      <button class="dash-tab-btn ${state.currentTab === 'pets' ? 'active' : ''}" onclick="switchShelterTab('pets')">
        <span>🐾 My Listed Pets</span>
        <span class="tab-badge">${shelterPets.length}</span>
      </button>
      <button class="dash-tab-btn ${state.currentTab === 'settings' ? 'active' : ''}" onclick="switchShelterTab('settings')">
        <span>⚙️ Shelter Settings</span>
      </button>
    </div>

    <!-- Tab Pane 1: Applications -->
    <div id="shelter-pane-applications" class="${state.currentTab === 'applications' ? '' : 'hidden'}">
      ${renderShelterApplicationsList(incomingApps)}
    </div>

    <!-- Tab Pane 2: My Listed Pets -->
    <div id="shelter-pane-pets" class="${state.currentTab === 'pets' ? '' : 'hidden'}">
      ${renderShelterPetsList(shelterPets)}
    </div>

    <!-- Tab Pane 3: Shelter Settings -->
    <div id="shelter-pane-settings" class="${state.currentTab === 'settings' ? '' : 'hidden'}">
      <div class="card" style="background:#fff; border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:2rem; max-width:640px;">
        <h3 style="margin-bottom:0.5rem;">Organization Profile</h3>
        <p class="text-muted text-sm mb-3">Your shelter profile linked to ${escapeHtml(user.email)}.</p>
        <div style="display:flex; flex-direction:column; gap:0.75rem; font-size:0.95rem;">
          <div><strong>Shelter Name:</strong> ${escapeHtml(shelter.name)}</div>
          <div><strong>Account Email:</strong> ${escapeHtml(shelter.email)}</div>
          <div><strong>Address:</strong> ${escapeHtml(shelter.address)}</div>
          <div><strong>Phone:</strong> ${escapeHtml(shelter.phone || "Not specified")}</div>
          <div><strong>System Shelter ID:</strong> <code>${escapeHtml(shelter._id)}</code></div>
        </div>
      </div>
    </div>
  `;
}

function switchShelterTab(tabName) {
  state.currentTab = tabName;
  document.querySelectorAll(".dash-tab-btn").forEach(btn => {
    const isTarget = btn.getAttribute("onclick")?.includes(tabName);
    btn.classList.toggle("active", isTarget);
  });
  const paneApps = document.getElementById("shelter-pane-applications");
  const panePets = document.getElementById("shelter-pane-pets");
  const paneSettings = document.getElementById("shelter-pane-settings");

  if (paneApps) paneApps.classList.toggle("hidden", tabName !== "applications");
  if (panePets) panePets.classList.toggle("hidden", tabName !== "pets");
  if (paneSettings) paneSettings.classList.toggle("hidden", tabName !== "settings");
}

function renderShelterApplicationsList(apps) {
  if (!apps.length) {
    return `
      <div class="empty-state">
        <span class="empty-icon">📭</span>
        <h3>No applications received yet</h3>
        <p>When adopters view your listed pets and click "Apply to Adopt", their requests will appear here for one-click approval or rejection.</p>
      </div>
    `;
  }

  return `
    <div class="applications-stream">
      ${apps.map(app => {
        const statusClass = app.status || "pending";
        return `
          <div class="shelter-app-card ${statusClass}">
            <div class="app-card-top">
              <div class="app-pet-snapshot">
                <img src="${escapeHtml(app.petPhoto || REAL_PHOTOS.Dog[0])}" alt="${escapeHtml(app.petName)}" class="app-pet-photo">
                <div class="app-pet-info">
                  <h4>Application for ${escapeHtml(app.petName || 'Pet')}</h4>
                  <small>${escapeHtml(app.petSpecies || '')} • ${escapeHtml(app.petBreed || '')}</small>
                </div>
              </div>
              <span class="status-badge ${statusClass}">${escapeHtml(statusClass)}</span>
            </div>

            <div class="app-applicant-box">
              <div class="applicant-meta-row">
                <span class="applicant-name">Applicant: ${escapeHtml(app.adopterName || 'Adopter')}</span>
                <a href="mailto:${escapeHtml(app.adopterEmail)}" class="applicant-email-link">${escapeHtml(app.adopterEmail || '')}</a>
              </div>
              <p class="applicant-message">"${escapeHtml(app.message || 'No additional message provided.')}"</p>
            </div>

            <div class="app-actions-bar">
              <span class="app-timestamp">Submitted: ${new Date(app.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              ${renderApplicationDecisionButtons(app)}
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderApplicationDecisionButtons(app) {
  const currentStatus = (app.status || "pending").toLowerCase();
  const id = String(app._id || app.id || "").trim();

  if (currentStatus === "approved") {
    return `
      <div class="app-decision-btns">
        <button class="btn btn-sm btn-approved-active" disabled title="Application is Approved">
          ✓ Approved
        </button>
        <button class="btn btn-outline btn-sm" onclick="updateApplicationStatus('${id}', 'rejected', this)" title="Change decision to Rejected">
          Change to Reject
        </button>
      </div>
    `;
  } else if (currentStatus === "rejected") {
    return `
      <div class="app-decision-btns">
        <button class="btn btn-outline btn-sm" onclick="updateApplicationStatus('${id}', 'approved', this)" title="Change decision to Approved">
          Change to Approve
        </button>
        <button class="btn btn-sm btn-rejected-active" disabled title="Application is Rejected">
          ✕ Rejected
        </button>
      </div>
    `;
  } else {
    return `
      <div class="app-decision-btns">
        <button class="btn btn-success btn-sm" onclick="updateApplicationStatus('${id}', 'approved', this)">
          ✓ Approve
        </button>
        <button class="btn btn-danger btn-sm" onclick="updateApplicationStatus('${id}', 'rejected', this)">
          ✕ Reject
        </button>
      </div>
    `;
  }
}

function renderShelterPetsList(pets) {
  if (!pets.length) {
    return `
      <div class="empty-state">
        <span class="empty-icon">🐾</span>
        <h3>No pets listed yet</h3>
        <p>List your shelter's animals to make them visible to thousands of adopters browsing PawMatch.</p>
        <button class="btn btn-primary mt-2" onclick="openAddPetModal()">+ List First Pet</button>
      </div>
    `;
  }

  return `
    <div class="shelter-pets-grid">
      ${pets.map(pet => {
        const photo = getPetPhoto(pet);
        return `
          <article class="pet-card">
            <div class="pet-card-image-wrap">
              <img src="${escapeHtml(photo)}" alt="${escapeHtml(pet.name)}" class="pet-card-image">
              <span class="pet-card-species-badge">${escapeHtml(pet.species)}</span>
            </div>
            <div class="pet-card-body">
              <div class="pet-card-header">
                <h3 class="pet-card-name">${escapeHtml(pet.name)}</h3>
                <span class="pet-card-gender">${escapeHtml(pet.gender)}</span>
              </div>
              <div class="pet-card-meta">
                ${escapeHtml(pet.breed)} • ${escapeHtml(pet.age)} yrs
              </div>
              <p class="pet-card-desc">${escapeHtml(pet.description || "In shelter care.")}</p>
              <div class="pet-card-footer">
                <button class="btn btn-outline btn-sm" onclick="openEditPetModal('${pet._id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="handleDeletePet('${pet._id}', '${escapeHtml(pet.name)}')">Delete</button>
              </div>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

// Shelter Status Decision: PUT /api/applications/:id/status
async function updateApplicationStatus(appId, newStatus, btnElement) {
  if (!appId) {
    showToast("Invalid application reference.", "error");
    return;
  }

  if (btnElement) {
    btnElement.disabled = true;
    btnElement.textContent = "Updating...";
  }

  let backendUpdated = false;
  let backendNotice = "";

  try {
    const res = await fetchApi(`/applications/${appId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: newStatus })
    });

    if (res && (res.success || res.application)) {
      backendUpdated = true;
    }
  } catch (err) {
    backendNotice = err.message;
    console.warn("Backend status update notice:", err);
  }

  // Synchronize client registry so UI immediately reflects updated status
  updateApplicationStatusInRegistry(appId, newStatus);

  if (backendUpdated) {
    showToast(`Application successfully marked as ${newStatus.toUpperCase()}!`);
  } else if (backendNotice) {
    showToast(`Status updated to ${newStatus.toUpperCase()} (${backendNotice})`);
  } else {
    showToast(`Application marked as ${newStatus.toUpperCase()}!`);
  }

  await renderDashboard();
}

/* --------------------------------------------------------------------------
   ADOPTER SPECIFIC DASHBOARD
   -------------------------------------------------------------------------- */
async function renderAdopterDashboard(user, container) {
  container.innerHTML = `
    <div class="dashboard-header-row">
      <div>
        <span class="eyebrow-text">Adopter Portal</span>
        <h1>Welcome, ${escapeHtml(user.name || user.email)}</h1>
        <p class="text-muted">Track your pet adoption requests and explore adoptable pets.</p>
      </div>
      <a href="#pets" class="btn btn-primary btn-sm">Find Pets →</a>
    </div>

    <div class="dashboard-tabs">
      <button class="dash-tab-btn active">
        <span>My Submitted Applications</span>
      </button>
    </div>

    <div id="adopter-apps-stream">
      <p class="text-muted">Loading your applications...</p>
    </div>
  `;

  loadMyApplicationsInto(document.getElementById("adopter-apps-stream"), user);
}

async function loadMyApplicationsInto(targetElement, user) {
  if (!targetElement) return;

  let apps = [];
  try {
    const res = await fetchApi("/applications/my");
    apps = res.applications || [];
  } catch (err) {
    // Fallback: load from client registry filtered by adopter email
    const registry = getGlobalApplications();
    apps = registry.filter(a => a.adopterEmail && a.adopterEmail.toLowerCase() === user.email.toLowerCase());
  }

  if (!apps.length) {
    targetElement.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🐶</span>
        <h3>No applications submitted yet</h3>
        <p>Browse our verified shelters and apply to adopt your dream pet today!</p>
        <a href="#pets" class="btn btn-primary mt-2">Browse Available Pets</a>
      </div>
    `;
    return;
  }

  targetElement.innerHTML = `
    <div class="applications-stream">
      ${apps.map(app => {
        const pet = app.petId || {};
        const statusClass = app.status || "pending";
        const photo = pet.imageUrl || getPetPhoto(pet);
        return `
          <div class="shelter-app-card ${statusClass}">
            <div class="app-card-top">
              <div class="app-pet-snapshot">
                <img src="${escapeHtml(photo)}" alt="${escapeHtml(pet.name || 'Pet')}" class="app-pet-photo">
                <div class="app-pet-info">
                  <h4>Application for ${escapeHtml(pet.name || 'Pet')}</h4>
                  <small>${escapeHtml(pet.species || '')} • ${escapeHtml(pet.breed || '')}</small>
                </div>
              </div>
              <span class="status-badge ${statusClass}">${escapeHtml(statusClass)}</span>
            </div>

            <div class="app-applicant-box">
              <div class="applicant-meta-row">
                <span class="applicant-name">Your Message to Shelter</span>
                <span class="app-timestamp">Submitted on: ${new Date(app.createdAt || Date.now()).toLocaleDateString()}</span>
              </div>
              <p class="applicant-message">"${escapeHtml(app.message || 'No additional message.')}"</p>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

async function loadMyApplications() {
  const container = document.getElementById("my-applications-list");
  const user = getUser();
  if (!user || !getToken()) {
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🔒</span>
          <h3>Log In to Track Applications</h3>
          <p>Please log in with your adopter account to view submitted adoption requests.</p>
          <a href="#login" class="btn btn-primary mt-2">Log In</a>
        </div>
      `;
    }
    return;
  }
  loadMyApplicationsInto(container, user);
}

/* ==========================================================================
   VIEW 7: ADOPTION APPLICATION SUBMISSION (POST /api/applications)
   ========================================================================== */
async function prepareApplyPage(petId) {
  const preview = document.getElementById("apply-pet-preview-card");
  const pageTitle = document.getElementById("apply-page-title");
  const alertBox = document.getElementById("apply-error-alert");
  alertBox.classList.add("hidden");

  const user = getUser();
  if (!user || !getToken()) {
    showToast("Please log in before submitting an adoption application.", "error");
    navigateTo("login");
    return;
  }

  try {
    const res = await fetchApi(`/pets/${petId}`);
    const pet = res.pet || res;
    state.currentPet = pet;

    if (pageTitle) pageTitle.textContent = `Apply to Adopt ${pet.name}`;
    if (preview) {
      const photo = getPetPhoto(pet);
      preview.innerHTML = `
        <div style="display:flex; align-items:center; gap:1.25rem; background:var(--bg-subtle); padding:1rem; border-radius:var(--radius-md); border:1px solid var(--border-color); margin-bottom:1.5rem;">
          <img src="${escapeHtml(photo)}" alt="${escapeHtml(pet.name)}" style="width:72px; height:72px; border-radius:var(--radius-sm); object-fit:cover;">
          <div>
            <h3 style="margin-bottom:0.2rem;">${escapeHtml(pet.name)}</h3>
            <p class="text-sm text-muted">${escapeHtml(pet.species)} • ${escapeHtml(pet.breed)} • ${escapeHtml(pet.age)} yrs old</p>
            <small class="text-xs text-muted">Shelter Ref: ${escapeHtml(pet.shelterId?._id || pet.shelterId || 'Direct Partner')}</small>
          </div>
        </div>
      `;
    }
  } catch (err) {
    showToast("Could not load pet for application.", "error");
    navigateTo("pets");
  }
}

async function handleAdoptionSubmit(event) {
  event.preventDefault();
  const alertBox = document.getElementById("apply-error-alert");
  alertBox.classList.add("hidden");

  const user = getUser();
  if (!user || !getToken()) {
    navigateTo("login");
    return;
  }

  if (!state.currentPet) {
    showToast("No pet selected.", "error");
    return;
  }

  const message = document.getElementById("apply-message").value.trim();
  const submitBtn = document.getElementById("submit-application-btn");

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting Application...";

  try {
    const res = await fetchApi("/applications", {
      method: "POST",
      body: JSON.stringify({
        petId: state.currentPet._id,
        message: message
      })
    });

    const appData = res.application || {
      _id: "app_" + Date.now(),
      adopterId: user.id || user._id,
      petId: state.currentPet._id,
      shelterId: state.currentPet.shelterId?._id || state.currentPet.shelterId,
      status: "pending",
      message: message,
      createdAt: new Date().toISOString()
    };

    // Save into the shared cross-role registry
    saveGlobalApplication({
      _id: appData._id,
      petId: state.currentPet._id,
      petName: state.currentPet.name,
      petSpecies: state.currentPet.species,
      petBreed: state.currentPet.breed,
      petPhoto: getPetPhoto(state.currentPet),
      adopterId: user.id || user._id,
      adopterName: user.name || user.email,
      adopterEmail: user.email,
      shelterId: state.currentPet.shelterId?._id || state.currentPet.shelterId,
      shelterEmail: state.currentPet.shelterId?.email || "",
      message: message,
      status: "pending",
      createdAt: new Date().toISOString()
    });

    showToast("Adoption application submitted successfully!");
    document.getElementById("apply-message").value = "";
    navigateTo("dashboard");
  } catch (err) {
    alertBox.textContent = err.message || "Failed to submit adoption application.";
    alertBox.classList.remove("hidden");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<span>Submit Adoption Request</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
  }
}

/* ==========================================================================
   MODAL: ADD PET (SHELTERS ONLY)
   ========================================================================== */
function openAddPetModal() {
  const modal = document.getElementById("modal-add-pet");
  const user = getUser();

  if (!user || user.role !== "shelter") {
    showToast("You must be logged in as a Shelter to list pets.", "error");
    return;
  }

  if (!state.currentShelter || !state.currentShelter._id) {
    showToast("Please complete your shelter profile first.", "error");
    return;
  }

  document.getElementById("add-pet-shelter-id").value = state.currentShelter._id;
  document.getElementById("modal-add-pet-shelter-info").textContent = `Listing under: ${state.currentShelter.name} (${state.currentShelter._id})`;

  // Populate photo picker gallery with real photos
  populatePhotoPickerGallery("Dog");

  modal.classList.remove("hidden");
}

function closeAddPetModal() {
  document.getElementById("modal-add-pet").classList.add("hidden");
  document.getElementById("add-pet-form").reset();
  document.getElementById("add-pet-error-alert").classList.add("hidden");
}

function onAddPetSpeciesChange(species) {
  populatePhotoPickerGallery(species);
}

function populatePhotoPickerGallery(species) {
  const gallery = document.getElementById("photo-picker-gallery");
  if (!gallery) return;

  const pool = REAL_PHOTOS[species] || REAL_PHOTOS.Dog;
  const currentUrl = document.getElementById("add-pet-image-url").value;

  gallery.innerHTML = pool.slice(0, 4).map((photoUrl, i) => {
    const isSelected = (currentUrl === photoUrl) || (i === 0 && !currentUrl);
    if (isSelected && !currentUrl) {
      document.getElementById("add-pet-image-url").value = photoUrl;
    }
    return `
      <div class="photo-choice-item ${isSelected ? 'selected' : ''}" onclick="selectPetPhotoChoice('${photoUrl}', this)">
        <img src="${photoUrl}" alt="${species}">
        ${isSelected ? '<span class="photo-choice-check">✓</span>' : ''}
      </div>
    `;
  }).join("");
}

function selectPetPhotoChoice(photoUrl, element) {
  document.getElementById("add-pet-image-url").value = photoUrl;
  document.querySelectorAll(".photo-choice-item").forEach(item => {
    item.classList.remove("selected");
    const check = item.querySelector(".photo-choice-check");
    if (check) check.remove();
  });
  element.classList.add("selected");
  const check = document.createElement("span");
  check.className = "photo-choice-check";
  check.textContent = "✓";
  element.appendChild(check);
}

async function handleCreatePet(event) {
  event.preventDefault();
  const alertBox = document.getElementById("add-pet-error-alert");
  alertBox.classList.add("hidden");

  const name = document.getElementById("add-pet-name").value.trim();
  const species = document.getElementById("add-pet-species").value;
  const breed = document.getElementById("add-pet-breed").value.trim();
  const age = Number(document.getElementById("add-pet-age").value);
  const gender = document.getElementById("add-pet-gender").value;
  const shelterId = document.getElementById("add-pet-shelter-id").value.trim();
  const description = document.getElementById("add-pet-desc").value.trim();
  const imageUrl = document.getElementById("add-pet-image-url").value.trim();

  const submitBtn = document.getElementById("add-pet-submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Publishing Pet...";

  try {
    const body = {
      name,
      species,
      breed,
      age,
      gender,
      description,
      shelterId
    };

    const res = await fetchApi("/pets", {
      method: "POST",
      body: JSON.stringify(body)
    });

    // If an image URL was selected, save locally for rich preview
    if (imageUrl && res.pet) {
      res.pet.imageUrl = imageUrl;
    }

    showToast(`Pet "${name}" published successfully!`);
    closeAddPetModal();
    renderDashboard();
  } catch (err) {
    alertBox.textContent = err.message || "Failed to list pet.";
    alertBox.classList.remove("hidden");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<span>Publish Pet Listing</span>`;
  }
}

/* ==========================================================================
   MODAL: EDIT PET (SHELTERS ONLY)
   ========================================================================== */
async function openEditPetModal(petId) {
  const modal = document.getElementById("modal-edit-pet");
  try {
    const res = await fetchApi(`/pets/${petId}`);
    const pet = res.pet || res;

    document.getElementById("edit-pet-id").value = pet._id;
    document.getElementById("edit-pet-name").value = pet.name;
    document.getElementById("edit-pet-species").value = pet.species;
    document.getElementById("edit-pet-breed").value = pet.breed;
    document.getElementById("edit-pet-age").value = pet.age;
    document.getElementById("edit-pet-gender").value = pet.gender;
    document.getElementById("edit-pet-desc").value = pet.description || "";

    modal.classList.remove("hidden");
  } catch (err) {
    showToast("Failed to fetch pet for editing.", "error");
  }
}

function closeEditPetModal() {
  document.getElementById("modal-edit-pet").classList.add("hidden");
}

async function handleUpdatePet(event) {
  event.preventDefault();
  const petId = document.getElementById("edit-pet-id").value;
  const name = document.getElementById("edit-pet-name").value.trim();
  const species = document.getElementById("edit-pet-species").value;
  const breed = document.getElementById("edit-pet-breed").value.trim();
  const age = Number(document.getElementById("edit-pet-age").value);
  const gender = document.getElementById("edit-pet-gender").value;
  const description = document.getElementById("edit-pet-desc").value.trim();

  try {
    await fetchApi(`/pets/${petId}`, {
      method: "PUT",
      body: JSON.stringify({ name, species, breed, age, gender, description })
    });

    showToast("Pet details updated successfully!");
    closeEditPetModal();
    renderDashboard();
  } catch (err) {
    document.getElementById("edit-pet-error-alert").textContent = err.message;
    document.getElementById("edit-pet-error-alert").classList.remove("hidden");
  }
}

async function handleDeletePet(petId, petName) {
  if (!confirm(`Are you sure you want to remove "${petName}" from adoption listings?`)) {
    return;
  }

  try {
    await fetchApi(`/pets/${petId}`, { method: "DELETE" });
    showToast(`Pet "${petName}" deleted successfully.`);
    renderDashboard();
  } catch (err) {
    showToast(err.message || "Failed to delete pet.", "error");
  }
}

/* ==========================================================================
   MODAL: API CONFIGURATION
   ========================================================================== */
function openApiConfigModal() {
  document.getElementById("api-url-input").value = API_BASE;
  document.getElementById("modal-api-config").classList.remove("hidden");
}

function closeApiConfigModal() {
  document.getElementById("modal-api-config").classList.add("hidden");
}

function setApiPreset(url) {
  document.getElementById("api-url-input").value = url;
}

function handleSaveApiConfig() {
  const newUrl = document.getElementById("api-url-input").value.trim();
  if (newUrl) {
    API_BASE = newUrl;
    localStorage.setItem("pawmatch_api_url", newUrl);
    showToast(`API Base updated to: ${newUrl}`);
    checkApiHealth();
    closeApiConfigModal();
    handleHashChange();
  }
}

/* ==========================================================================
   EVENT LISTENERS INITIALIZATION
   ========================================================================== */
function initEvents() {
  window.addEventListener("hashchange", handleHashChange);

  // Forms
  const loginForm = document.getElementById("login-form");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);

  const registerForm = document.getElementById("register-form");
  if (registerForm) registerForm.addEventListener("submit", handleRegister);

  const applyForm = document.getElementById("adoption-application-form");
  if (applyForm) applyForm.addEventListener("submit", handleAdoptionSubmit);

  const addPetForm = document.getElementById("add-pet-form");
  if (addPetForm) addPetForm.addEventListener("submit", handleCreatePet);

  const editPetForm = document.getElementById("edit-pet-form");
  if (editPetForm) editPetForm.addEventListener("submit", handleUpdatePet);

  // Buttons
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

  const searchBtn = document.getElementById("search-btn");
  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      const q = document.getElementById("pet-search-input").value.trim();
      loadPets(q);
    });
  }

  const searchInput = document.getElementById("pet-search-input");
  if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        loadPets(searchInput.value.trim());
      }
    });
  }

  const searchClearBtn = document.getElementById("search-clear-btn");
  if (searchClearBtn) searchClearBtn.addEventListener("click", resetPetFilters);

  const petsRefreshBtn = document.getElementById("pets-refresh-btn");
  if (petsRefreshBtn) petsRefreshBtn.addEventListener("click", () => loadPets());

  const myAppsRefreshBtn = document.getElementById("refresh-my-apps-btn");
  if (myAppsRefreshBtn) myAppsRefreshBtn.addEventListener("click", loadMyApplications);

  // Species Filter Chips
  document.querySelectorAll(".species-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      filterBySpecies(chip.dataset.species, chip);
    });
  });

  // Modal Closures
  document.getElementById("modal-add-pet-close")?.addEventListener("click", closeAddPetModal);
  document.getElementById("add-pet-cancel-btn")?.addEventListener("click", closeAddPetModal);
  document.getElementById("modal-edit-pet-close")?.addEventListener("click", closeEditPetModal);
  document.getElementById("edit-pet-cancel-btn")?.addEventListener("click", closeEditPetModal);

  const apiToggleBtn = document.getElementById("api-toggle-btn");
  if (apiToggleBtn) apiToggleBtn.addEventListener("click", openApiConfigModal);
  document.getElementById("modal-api-close")?.addEventListener("click", closeApiConfigModal);
  document.getElementById("api-save-btn")?.addEventListener("click", handleSaveApiConfig);
}

// Explicitly expose global handlers for dynamically rendered HTML templates
window.updateApplicationStatus = updateApplicationStatus;
window.renderApplicationDecisionButtons = renderApplicationDecisionButtons;
window.openAddPetModal = openAddPetModal;
window.closeAddPetModal = closeAddPetModal;
window.openEditPetModal = openEditPetModal;
window.closeEditPetModal = closeEditPetModal;
window.handleDeletePet = handleDeletePet;
window.selectPetPhotoChoice = selectPetPhotoChoice;
window.onAddPetSpeciesChange = onAddPetSpeciesChange;
window.switchShelterTab = switchShelterTab;
window.openApiConfigModal = openApiConfigModal;
window.closeApiConfigModal = closeApiConfigModal;
window.setApiPreset = setApiPreset;
window.handleSaveApiConfig = handleSaveApiConfig;
window.handleCreateShelterProfile = handleCreateShelterProfile;
window.resetPetFilters = resetPetFilters;
window.filterBySpecies = filterBySpecies;
window.renderDashboard = renderDashboard;
window.loadPets = loadPets;
window.loadMyApplications = loadMyApplications;

// Initial Boot
document.addEventListener("DOMContentLoaded", () => {
  initEvents();
  checkApiHealth();
  updateNavState();
  handleHashChange();
});

