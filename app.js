/* ═══════════════════════════════════════════════════════
   FIREBASE CONFIGURATION
   ═══════════════════════════════════════════════════════
   🔑  SETUP INSTRUCTIONS:
       1. Go to https://console.firebase.google.com
       2. Create or select your project
       3. Project Settings → General → "Your apps" → Register a Web app
       4. Copy the firebaseConfig object
       5. Paste your real values below, replacing every "YOUR_…" placeholder
       6. In Firestore, create a database (start in test mode for dev)
   ═══════════════════════════════════════════════════════ */
const firebaseConfig = {
  apiKey: "AIzaSyBq_iDHPbO5PqEe1ND-zBgw9bmULushI5c",
  authDomain: "civic-db-bb5c6.firebaseapp.com",
  projectId: "civic-db-bb5c6",
  storageBucket: "civic-db-bb5c6.firebasestorage.app",
  messagingSenderId: "459829330160",
  appId: "1:459829330160:web:06f0cefdf7b4b6e7464235"
};

/* Conditionally init Firebase (only index.html loads the SDK) */
let db = null;
if (typeof firebase !== "undefined" && firebase.initializeApp) {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
}

const COLLECTION = "empathy_stories";


/* ═══════════════════════════════════════════════════════
   1.  DARK / LIGHT MODE  (persisted via localStorage)
   ═══════════════════════════════════════════════════════ */
(function initTheme() {
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));
})();

function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  const cb = document.getElementById("theme-cb");
  if (cb) cb.checked = (t === "dark");
  localStorage.setItem("theme", t);
}

const themeCb = document.getElementById("theme-cb");
if (themeCb) {
  themeCb.addEventListener("change", () => {
    applyTheme(themeCb.checked ? "dark" : "light");
  });
}


/* ═══════════════════════════════════════════════════════
   2.  MOBILE HAMBURGER
   ═══════════════════════════════════════════════════════ */
const burger  = document.getElementById("hamburger");
const navMenu = document.getElementById("nav-menu");
if (burger && navMenu) {
  burger.addEventListener("click", () => navMenu.classList.toggle("open"));
  navMenu.querySelectorAll("a").forEach(a =>
    a.addEventListener("click", () => navMenu.classList.remove("open"))
  );
}


/* ═══════════════════════════════════════════════════════
   3.  NAVBAR SCROLL SHADOW
   ═══════════════════════════════════════════════════════ */
const nav = document.getElementById("navbar");
window.addEventListener("scroll", () => {
  if (nav) nav.classList.toggle("scrolled", window.scrollY > 50);
});


/* ═══════════════════════════════════════════════════════
   4.  REVEAL ON SCROLL
   ═══════════════════════════════════════════════════════ */
const revealObs = new IntersectionObserver(
  (entries) => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("revealed"); revealObs.unobserve(e.target); }
  }),
  { threshold: 0.1 }
);
document.querySelectorAll(".reveal").forEach(el => revealObs.observe(el));


/* ═══════════════════════════════════════════════════════
   5.  SMOOTH ANCHOR LINKS
   ═══════════════════════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener("click", e => {
    const t = document.querySelector(a.getAttribute("href"));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: "smooth", block: "start" }); }
  });
});


/* ═══════════════════════════════════════════════════════
   6.  HERO TYPING EFFECT  (optional enhancement)
   ═══════════════════════════════════════════════════════
   If there's a .typed-word element, animate typing into it.
   ═══════════════════════════════════════════════════════ */
const typedEl = document.querySelector(".typed-word");
if (typedEl) {
  const words = ["Empathy", "Kindness", "Respect", "Action"];
  let wi = 0, ci = 0, deleting = false;
  function typeLoop() {
    const word = words[wi];
    if (!deleting) {
      typedEl.textContent = word.slice(0, ++ci);
      if (ci === word.length) { deleting = true; setTimeout(typeLoop, 1800); return; }
    } else {
      typedEl.textContent = word.slice(0, --ci);
      if (ci === 0) { deleting = false; wi = (wi + 1) % words.length; }
    }
    setTimeout(typeLoop, deleting ? 60 : 120);
  }
  typeLoop();
}


/* ═══════════════════════════════════════════════════════
   7.  FORM → FIRESTORE
   ═══════════════════════════════════════════════════════ */
const storyForm = document.getElementById("story-form");
const submitBtn = document.getElementById("submit-btn");
const formMsg   = document.getElementById("form-msg");

if (storyForm && db) {
  storyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name  = document.getElementById("input-name").value.trim();
    const email = document.getElementById("input-email").value.trim();
    const msg   = document.getElementById("input-msg").value.trim();

    if (!name || !email || !msg) { showMsg("Please fill in every field.", "err"); return; }

    setLoading(true); clearMsg();

    try {
      await db.collection(COLLECTION).add({
        name, email, comment: msg,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      showMsg("Thank you — your story is live! 💚", "ok");
      storyForm.reset();
    } catch (err) {
      console.error("Write error:", err);
      showMsg("Something went wrong. Please try again.", "err");
    } finally { setLoading(false); }
  });
}


/* ═══════════════════════════════════════════════════════
   8.  REAL-TIME WALL  (Firestore onSnapshot)
   ═══════════════════════════════════════════════════════ */
const container = document.getElementById("stories-container");
const loader    = document.getElementById("wall-loader");
const empty     = document.getElementById("wall-empty");

if (container && db) {
  db.collection(COLLECTION)
    .orderBy("timestamp", "desc")
    .onSnapshot(snap => {
      if (loader) loader.classList.add("hidden");
      container.querySelectorAll(".story-card").forEach(c => c.remove());

      if (snap.empty) { if (empty) empty.classList.remove("hidden"); return; }
      if (empty) empty.classList.add("hidden");

      snap.forEach((doc, i) => container.appendChild(makeCard(doc.data(), i)));
    }, err => {
      console.error("Read error:", err);
      if (loader) loader.classList.add("hidden");
      if (empty) { empty.textContent = "Could not load stories."; empty.classList.remove("hidden"); }
    });
}


/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */
function makeCard(d, i) {
  const el = document.createElement("article");
  el.className = "story-card";
  el.style.animationDelay = `${i * .06}s`;
  const init = d.name ? d.name.charAt(0).toUpperCase() : "?";
  let date = "Just now";
  if (d.timestamp) date = d.timestamp.toDate().toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
  el.innerHTML = `
    <span class="qm">"</span>
    <p class="text">${esc(d.comment)}</p>
    <div class="story-meta">
      <div class="story-avatar">${init}</div>
      <span class="story-author">${esc(d.name)}</span>
      <span class="story-date">${date}</span>
    </div>`;
  return el;
}

function esc(s) { const d = document.createElement("div"); d.appendChild(document.createTextNode(s)); return d.innerHTML; }
function setLoading(on) { if (submitBtn) { submitBtn.classList.toggle("loading", on); submitBtn.disabled = on; } }
function showMsg(t, c) { if (formMsg) { formMsg.textContent = t; formMsg.className = `form-msg ${c}`; } }
function clearMsg()     { if (formMsg) { formMsg.textContent = ""; formMsg.className = "form-msg"; } }
