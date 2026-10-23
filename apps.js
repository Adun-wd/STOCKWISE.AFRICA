(() => {
/*
  inventory.js
  ------------
  Logic for the Inventory page (section 8):
    1. Mock product data (replace with the API / shared storage later)
    2. Status rules: out of stock, low stock, expiring soon, in stock
    3. Search + category + status filters
    4. Pagination
    5. Rendering the mobile cards and the desktop table
    6. Building the sidebar and bottom nav
*/
 
// ---------- 1. MOCK DATA ----------
// stock <= reorderLevel means "low stock"; stock 0 means "out of stock".
// Prices and some numbers are placeholders taken from the Figma screens.
const products = [
  { id: 1, name: "Paracetamol 500mg", category: "Tablet", price: 1200, stock: 48, reorderLevel: 10, expiry: "2027-02-28", added: "2026-04-12", batch: "B12345", image: "paracetamol.png" },
  { id: 2, name: "Amoxicillin 250mg", category: "Capsule", price: 2500, stock: 6, reorderLevel: 10, expiry: "2027-02-28", added: "2026-04-20", batch: "B12345", image: "images/amoxicillin.png" },
  { id: 3, name: "Vitamin C 1000mg", category: "Tablet", price: 3000, stock: 32, reorderLevel: 10, expiry: "2027-06-30", added: "2026-05-03", batch: "B12345", image: "images/vitamin-c.png" },
  { id: 4, name: "Ibuprofen 400mg", category: "Tablet", price: 1000, stock: 9, reorderLevel: 10, expiry: "2027-10-31", added: "2026-05-18", batch: "B12345", image: "images/ibuprofen.png" },
  { id: 5, name: "Loratadine 10mg", category: "Tablet", price: 1600, stock: 0, reorderLevel: 10, expiry: "2027-07-31", added: "2026-06-02", batch: "B12345", image: "images/loratadine.png" },
  { id: 6, name: "Oral Rehydration Salts", category: "Sachet", price: 200, stock: 75, reorderLevel: 10, expiry: "2027-09-30", added: "2026-06-15", batch: "B12345", image: "images/oral-rehydration-salts.png" },
  { id: 7, name: "Hydrogen Peroxide", category: "Liquid", price: 600, stock: 14, reorderLevel: 10, expiry: "2026-10-31", added: "2026-07-01", batch: "B12345", image: "images/hydrogen-peroxide.png" },
  { id: 8, name: "Coartem 20/120mg", category: "Tablet", price: 3800, stock: 40, reorderLevel: 10, expiry: "2027-01-31", added: "2026-07-22", batch: "B12345", image: "images/coartem.png" },
  { id: 9, name: "Metformin 500mg", category: "Tablet", price: 2200, stock: 25, reorderLevel: 10, expiry: "2027-08-31", added: "2026-08-05", batch: "B12345", image: "images/metformin.png" },
  { id: 10, name: "Multivitamin Syrup", category: "Syrup", price: 1800, stock: 8, reorderLevel: 10, expiry: "2027-02-28", added: "2026-08-19", batch: "B12345", image: "images/multivitamin-syrup.png" },
  { id: 11, name: "Diclofenac Gel", category: "Gel", price: 2800, stock: 5, reorderLevel: 10, expiry: "2027-04-30", added: "2026-09-10", batch: "B12345", image: "images/diclofenac-gel.png" },
];
 
// ---------- 2. SETTINGS AND STATUS RULES ----------
const PAGE_SIZE = 10;
const EXPIRING_DAYS = 90; // "expiring soon" = expires within this many days
 
const STATUS = {
  in: { label: "In stock", cls: "bg-green-100 text-green-700" },
  low: { label: "Low stock", cls: "bg-orange-100 text-orange-600" },
  out: { label: "Out of stock", cls: "bg-red-100 text-red-500" },
  expiring: { label: "Expiring soon", cls: "bg-pink-100 text-rose-500" },
};
 
function statusOf(p) {
  if (p.stock === 0) return "out";
  if (p.stock <= p.reorderLevel) return "low";
  const daysLeft = (new Date(p.expiry) - new Date()) / 86400000;
  if (daysLeft <= EXPIRING_DAYS) return "expiring";
  return "in";
}
 
// ---------- 3. PAGE STATE ----------
const state = { query: "", status: "all", category: "all", from: "", to: "", page: 1 };
 
// ---------- GRAB ELEMENTS ----------
const $ = (id) => document.getElementById(id);
const searchInput = $("search");
const statusSelect = $("statusSelect");
const categorySelects = [$("category"), $("categoryMobile")];
 
// ---------- HELPERS ----------
function money(n) {
  return "₦" + n.toLocaleString("en-NG");
}
 
function monthYear(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
 
function badge(p) {
  const s = STATUS[statusOf(p)];
  return `<span class="inline-block rounded-md px-2 py-1 text-[11px] font-medium ${s.cls}">${s.label}</span>`;
}
 
// Letter tile, used when a product has no picture or the file is missing
function tile(p, size) {
  return `<div class="${size} rounded-md bg-[#143967]/10 flex items-center justify-center font-bold shrink-0">${p.name[0]}</div>`;
}
 
// Picture if the product has one. If the file fails to load, swap in the tile.
function thumb(p, size) {
  if (!p.image) return tile(p, size);
  return `<img src="${p.image}" alt="" class="${size} rounded-md object-cover bg-[#143967]/10 shrink-0" data-tile='${tile(p, size)}' onerror="this.outerHTML = this.dataset.tile" />`;
}
 
function getFiltered() {
  const q = state.query.trim().toLowerCase();
  return products.filter((p) => {
    const matchesText = p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    const matchesStatus = state.status === "all" || statusOf(p) === state.status;
    const matchesCategory = state.category === "all" || p.category === state.category;
    const matchesDate = (!state.from || p.added >= state.from) && (!state.to || p.added <= state.to);
    return matchesText && matchesStatus && matchesCategory && matchesDate;
  });
}
 
// ---------- 4 + 5. RENDER ----------
function render() {
  const list = getFiltered();
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  if (state.page > totalPages) state.page = totalPages;
  const start = (state.page - 1) * PAGE_SIZE;
  const pageItems = list.slice(start, start + PAGE_SIZE);
 
  $("totalLabel").textContent = "Total products: " + products.length;
 
  // Mobile cards. The chevron links to the product details page (not built yet).
  $("cards").innerHTML = pageItems
    .map(
      (p) => `
    <li>
      <a href="#" class="flex items-center gap-3 py-3">
        ${thumb(p, "w-14 h-14")}
        <div class="flex-1 min-w-0">
          <p class="text-[13px] font-bold text-black truncate">${p.name}</p>
          <p class="text-[11px] font-semibold">${p.category}</p>
          <p class="text-[11px] text-black/60">Stock: ${p.stock} | Exp: ${monthYear(p.expiry)}</p>
          <p class="mt-1 flex items-center gap-2 text-[13px] font-bold text-black">${money(p.price)} ${badge(p)}</p>
        </div>
        <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#143967" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6" /></svg>
      </a>
    </li>`
    )
    .join("");
 
  // Desktop table rows
  $("rows").innerHTML = pageItems
    .map(
      (p) => `
    <tr>
      <td class="p-3"><input type="checkbox" class="row-check" aria-label="Select ${p.name}" /></td>
      <td class="p-3 text-left"><div class="flex items-center gap-3">${thumb(p, "w-9 h-9")}<div><p class="font-semibold">${p.name}</p><p class="text-[10px] text-[#143967]/60">Batch: ${p.batch}</p></div></div></td>
      <td class="p-3 font-semibold">${p.category}</td>
      <td class="p-3 font-semibold">${money(p.price)}</td>
      <td class="p-3 font-semibold">${p.stock}</td>
      <td class="p-3 font-semibold">${p.reorderLevel}</td>
      <td class="p-3 font-semibold">${monthYear(p.expiry)}</td>
      <td class="p-3">${badge(p)}</td>
      <td class="p-3">
        <div class="flex items-center justify-center gap-3">
          <a href="#" aria-label="Edit ${p.name}"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#143967" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l1-4L16 5l3 3L8 19zM14 7l3 3" /></svg></a>
          <button type="button" data-delete="${p.id}" aria-label="Delete ${p.name}"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#143967" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></svg></button>
        </div>
      </td>
    </tr>`
    )
    .join("");
  $("selectAll").checked = false;
 
  // Empty state
  $("empty").classList.toggle("hidden", list.length > 0);
  $("pager").classList.toggle("hidden", list.length === 0);
 
  // Pagination text and buttons
  const from = list.length === 0 ? 0 : start + 1;
  $("showing").textContent = `Showing ${from}-${start + pageItems.length} of ${list.length} products`;
 
  let pagesHtml = pageButton("‹", state.page - 1, state.page === 1);
  for (let i = 1; i <= totalPages; i++) pagesHtml += pageButton(i, i, false, i === state.page);
  pagesHtml += pageButton("›", state.page + 1, state.page === totalPages);
  $("pages").innerHTML = pagesHtml;
 
  renderChips();
}
 
function pageButton(label, page, disabled, active) {
  const look = active ? "bg-[#143967] text-white" : "border border-[#143967]/20";
  return `<button type="button" data-page="${page}" ${disabled ? "disabled" : ""} class="w-8 h-8 rounded-md ${look} disabled:opacity-30">${label}</button>`;
}
 
// Mobile status chips
const CHIPS = [["all", "All"], ["in", "In Stock"], ["low", "Low Stock"], ["out", "Out of Stock"], ["expiring", "Expiring"]];
 
function renderChips() {
  $("chips").innerHTML = CHIPS.map(([key, label]) => {
    const look = state.status === key ? "bg-[#143967] text-white" : "bg-[#143967]/10 text-[#143967]";
    return `<button type="button" data-status="${key}" class="shrink-0 rounded-full px-4 py-2 text-[12px] font-semibold ${look}">${label}</button>`;
  }).join("");
}
 
// ---------- EVENTS ----------
// The top-bar search and the filter-row search share one query
[searchInput, $("globalSearch")].forEach((input) =>
  input.addEventListener("input", () => {
    state.query = input.value;
    searchInput.value = state.query;
    $("globalSearch").value = state.query;
    state.page = 1;
    render();
  })
);
 
// Date range (filters by the date the product was added)
[["dateFrom", "from"], ["dateTo", "to"]].forEach(([id, key]) =>
  $(id).addEventListener("change", () => {
    state[key] = $(id).value;
    state.page = 1;
    render();
  })
);
 
// Header checkbox selects or clears every row on this page
$("selectAll").addEventListener("change", () => {
  document.querySelectorAll(".row-check").forEach((box) => (box.checked = $("selectAll").checked));
});
 
statusSelect.addEventListener("change", () => {
  state.status = statusSelect.value;
  state.page = 1;
  render();
});
 
categorySelects.forEach((select) =>
  select.addEventListener("change", () => {
    state.category = select.value;
    categorySelects.forEach((s) => (s.value = state.category)); // keep both in sync
    state.page = 1;
    render();
  })
);
 
$("chips").addEventListener("click", (e) => {
  const chip = e.target.closest("[data-status]");
  if (!chip) return;
  state.status = chip.dataset.status;
  statusSelect.value = state.status;
  state.page = 1;
  render();
});
 
$("pages").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-page]");
  if (!btn || btn.disabled) return;
  state.page = Number(btn.dataset.page);
  render();
});
 
$("rows").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-delete]");
  if (!btn) return;
  const id = Number(btn.dataset.delete);
  const product = products.find((p) => p.id === id);
  if (product && confirm("Delete " + product.name + "?")) {
    products.splice(products.indexOf(product), 1);
    render();
  }
});
 
// Mobile filter button shows/hides the category dropdown
$("filterBtn").addEventListener("click", () => $("categoryMobile").classList.toggle("hidden"));
 
$("clearBtn").addEventListener("click", () => {
  state.query = "";
  state.status = "all";
  state.category = "all";
  state.from = "";
  state.to = "";
  searchInput.value = "";
  $("globalSearch").value = "";
  $("dateFrom").value = "";
  $("dateTo").value = "";
  statusSelect.value = "all";
  categorySelects.forEach((s) => (s.value = "all"));
  render();
});
 
// ---------- 6. NAVIGATION ----------
// Links that point to "#" are pages that are not built yet.
const ICONS = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9z",
  inventory: "M4 4h16v16H4zM8 9h8M8 13h5",
  sales: "M4 3h16v18H4zM7 7h10M7 11h10M7 15h6",
  alerts: "M6 10a6 6 0 0 1 12 0c0 3 1 4 1 5H5c0-1 1-2 1-5zM10 18a2 2 0 0 0 4 0",
  reports: "M3 3v18h18M7 15l4-4 3 3 5-6",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12h2M3 12h2M12 3v2M12 19v2",
  logout: "M9 21H5V3h4M16 17l5-5-5-5M21 12H9",
  more: "M5 5h2M11 5h2M17 5h2M5 11h2M11 11h2M17 11h2M5 17h2M11 17h2M17 17h2",
};
 
const NAV = {
  home: { label: "Home", href: "#" },
  inventory: { label: "Inventory", href: "#inventory" },
  sales: { label: "Sales", href: "#sales" },
  alerts: { label: "Alerts", href: "#alerts" },
  reports: { label: "Reports", href: "#" },
  settings: { label: "Settings", href: "#business" },
  logout: { label: "Logout", href: "#" },
  more: { label: "More", href: "#" },
};
 
function icon(key) {
  return `<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[key]}" /></svg>`;
}
 
function sidebarLink(key) {
  const item = NAV[key];
  const look = key === "inventory" ? "bg-white text-[#143967] font-semibold" : key === "logout" ? "text-red-400 hover:bg-white/10" : "text-white hover:bg-white/10";
  return `<a href="${item.href}" class="flex items-center gap-3 rounded-lg px-3 py-2.5 ${look}">${icon(key)}${item.label}</a>`;
}
 
function bottomLink(key) {
  const item = NAV[key];
  const look = key === "inventory" ? "bg-[#143967] text-white px-[15px] py-1 rounded-full" : "text-[#143967]";
  return `<a href="${item.href}" class="flex flex-col items-center gap-1 ${look}">${icon(key)}<span class="text-[12px]">${item.label}</span></a>`;
}
 
 
// ---------- START ----------
// Fill the category dropdowns from the data, then draw the page.
const categories = [...new Set(products.map((p) => p.category))];
categorySelects.forEach((select) => {
  select.innerHTML += categories.map((c) => `<option value="${c}">${c}</option>`).join("");
});
products.forEach((product) => {
  const sku = "SKU" + String(product.id).padStart(3, "0");
  try {
    const savedStock = localStorage.getItem("stock:" + sku);
    if (savedStock !== null && Number.isFinite(Number(savedStock))) product.stock = Number(savedStock);
  } catch (error) {}
});
render();

// The Sales screen records transactions against the same prototype inventory.
window.stockwiseProducts = products;
window.stockwiseRenderInventory = render;
window.stockwiseProductStatus = statusOf;
 
})();

(() => {
// Stockwise Africa - Settings

// Views: Business Info, Profile, Teams & Roles (+ Custom Permissions), Notifications, Terms & Conditions, Privacy Policy

// Frontend-only prototype: there is no backend, so nothing is stored or emailed.



// ---------- Legal content ----------

const LEGAL = {

  terms: {

    title: "Terms & Conditions",

    version: "v.1.0.2",

    published: "October 5, 2026",

    intro: "Welcome to Stockwise Africa. These Terms and Conditions govern your use of the Stockwise Africa inventory and sales management platform.",

    sections: [

      ["1. About Stockwise Africa", "Stockwise Africa provides businesses with tools to manage products, inventory, stock movements, sales, team access, alerts and reports."],

      ["2. Your Account", "You must provide accurate information, keep your login credentials secure and notify us if you suspect unauthorized access to your account."],

      ["3. Business and Inventory Information", "You are responsible for the accuracy of the information you enter into Stockwise Africa, including product details, quantities, prices and sales records."],

      ["4. Team Members and Permissions", "You can invite team members and assign roles and permissions. You are responsible for ensuring appropriate access and removing access when no longer needed."],

      ["5. Acceptable Use", "You agree not to use Stockwise Africa for unlawful purposes, attempt to gain unauthorized access, interfere with the service or upload harmful content."],

      ["6. Service Availability", "We work to keep Stockwise Africa available and reliable, but we do not guarantee that the service will always be uninterrupted or error-free. We may carry out maintenance or updates that temporarily affect access."]

    ]

  },

  privacy: {

    title: "Privacy Policy",

    version: "v.1.0.2",

    published: "October 5, 2026",

    intro: "Stockwise Africa respects your privacy and is committed to protecting the information you provide when using our inventory and sales management platform.",

    sections: [

      ["1. Information We Collect", "We collect information you provide when you create an account, use our services or interact with us. This includes your name, email address, phone number, business details and information about your inventory, sales and team members."],

      ["2. How We Use Your Information", "We use your information to provide and maintain our services, manage your account, track inventory and sales, generate reports, send notifications and improve your experience on Stockwise Africa."],

      ["3. How We Protect Your Information", "We use reasonable security measures to protect your data from unauthorized access, loss or misuse. However, no online service can be guaranteed to be 100 percent secure."],

      ["4. Sharing Your Information", "We do not sell your personal information. We may share information with trusted service providers when necessary to operate our platform or when required by law."],

      ["5. Team Member Access", "If you use Stockwise Africa with other members of your business, your account administrator may assign roles and permissions that determine what information they can access."]

    ]

  }

};



// ---------- Sample data ----------

const members = [

  { ini: "JD", name: "John Doe",     title: "Owner",           email: "johndoe@example.com",      role: "Owner",     status: "Active",   last: "Today, 9:24 AM" },

  { ini: "AM", name: "Alex Morgan",  title: "Manager",         email: "alex.morgan@example.com",  role: "Manager",   status: "Active",   last: "Today, 8:12 AM", phone: "+234 812 345 6789" },

  { ini: "SC", name: "Sarah Connor", title: "Sales Attendant", email: "s.connor@example.com",     role: "Attendant", status: "Active",   last: "Today, 7:45 AM" },

  { ini: "MS", name: "Mary Smith",   title: "Sales Attendant", email: "marysmith@domain.com",     role: "Attendant", status: "Active",   last: "Yesterday, 6:32 PM" },

  { ini: "JD", name: "Jane Doe",     title: "Sales Attendant", email: "janedoe@stockwave.com",    role: "Attendant", status: "Inactive", last: "Apr 25, 2026" }

];



const permissionGroups = {

  "Inventory": ["View inventory", "Add new products", "Edit products", "Delete Products"],

  "Stock Management": ["Add stock", "Remove stock", "View stock history"],

  "Sales": ["Record sales", "View sales history", "Issue refunds"],

  "Reports": ["View reports", "Export reports"]

};



const notificationGroups = {

  "Inventory Alerts": ["Low stock alerts", "Out of stock alerts", "Expiring products alerts"],

  "Sales Activity": ["Daily sales summary", "Large sales alerts"],

  "Team Activity": ["New team member added", "Role or permission changed"]

};



const roleBadge = {

  Owner: "bg-navy text-white",

  Manager: "bg-blue-100 text-blue-800",

  Attendant: "bg-indigo-100 text-indigo-600"

};



// The member shown on the Custom Permissions and Notifications views

let selected = members[1];



// Saved toggle settings, kept per member (email -> { "Group|Item": true/false })

let permState = {};

let notifState = {};



// ---------- Views ----------

// Each key matches a link in the Settings menu (href="#business", "#profile", ...).

// "menu" is the menu item that stays highlighted (Custom Permissions belongs under Teams & Roles).

const SETTINGS_SUBTITLE = "Manage your business settings, preferences and system configuration.";

const TEAMS_SUBTITLE = "Manage your team members, assign roles and control access to different features";

const LEGAL_SUBTITLE = "Manage your legal preferences here.";



const VIEWS = {

  business:      { title: "Settings",      subtitle: SETTINGS_SUBTITLE, menu: "business" },

  profile:       { title: "Settings",      subtitle: SETTINGS_SUBTITLE, menu: "profile" },

  teams:         { title: "Teams & Roles", subtitle: TEAMS_SUBTITLE,    menu: "teams" },

  permissions:   { title: "Teams & Roles", subtitle: TEAMS_SUBTITLE,    menu: "teams" },

  notifications: { title: "Settings",      subtitle: SETTINGS_SUBTITLE, menu: "notifications" },

  terms:         { title: "Legal",         subtitle: LEGAL_SUBTITLE,    menu: "terms",   doc: "terms" },

  privacy:       { title: "Legal",         subtitle: LEGAL_SUBTITLE,    menu: "privacy", doc: "privacy" }

};



// ---------- Page elements ----------

const topSearch = document.getElementById("top-search");

const statusMessage = document.getElementById("status-message");



const appShell = document.getElementById("app-shell");
const loginScreen = document.getElementById("login-screen");

const pageTitle = document.getElementById("page-title");

const pageSubtitle = document.getElementById("page-subtitle");

const headerInvite = document.getElementById("header-invite");

const settingsLinks = document.querySelectorAll(".settings-link");

const views = document.querySelectorAll(".view");



const publicLegal = document.getElementById("public-legal");

const publicDoc = document.getElementById("public-doc");



const inviteDialog = document.getElementById("invite-dialog");

const inviteForm = document.getElementById("invite-form");

const inviteEmail = document.getElementById("invite-email");

const inviteRole = document.getElementById("invite-role");

const inviteError = document.getElementById("invite-error");

const inviteSuccess = document.getElementById("invite-success");



const notificationButton = document.getElementById("notification-button");

const notificationPanel = document.getElementById("notification-panel");



const sidebar = document.getElementById("sidebar");

const sidebarOverlay = document.getElementById("sidebar-overlay");



// ---------- Helpers ----------

let statusTimer = null;



// Shows a short message at the bottom of the screen, then hides it after 3.5 seconds.

function showStatus(message) {

  statusMessage.textContent = message; // textContent keeps typed text safe

  statusMessage.classList.remove("hidden");

  clearTimeout(statusTimer);

  statusTimer = setTimeout(function () {

    statusMessage.classList.add("hidden");

  }, 3500);

}



// Makes text safe to put inside innerHTML (member names and emails will come from users later)

function esc(text) {

  return String(text).replace(/[&<>"']/g, function (character) {

    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];

  });

}



// A simple check: something@something.something (no spaces)

function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

}



// Any button with data-toast="..." just shows that message

document.querySelectorAll("[data-toast]").forEach(function (button) {

  button.addEventListener("click", function () { showStatus(button.dataset.toast); });

});



// ---------- Legal document markup ----------

// The text above is fixed content written by us, so it is safe to build with innerHTML.

// headingTag is "h2" inside Settings (the page already has an h1) and "h1" on the logged-out view.

function legalHTML(doc, headingTag) {

  const sections = doc.sections.map(function (item) {

    return (

      '<h3 class="mt-8 text-lg font-bold leading-8">' + item[0] + "</h3>" +

      '<p class="text-lg leading-8">' + item[1] + "</p>"

    );

  }).join("");



  return (

    "<article>" +

      "<" + headingTag + ' class="font-grotesk text-2xl font-bold">' + doc.title + "</" + headingTag + ">" +

      '<p class="mt-1 flex flex-wrap items-center gap-2.5 text-sm">' +

        '<span class="rounded-[5px] bg-navy/10 px-2 py-0.5 text-xs font-semibold">' + doc.version + "</span>" +

        "<span>Published on <strong>" + doc.published + "</strong></span>" +

      "</p>" +

      '<button type="button" data-print class="no-print mt-2 flex items-center gap-[5px] text-sm font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-navy">' +

        '<svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>' +

        "Download as PDF" +

      "</button>" +

      '<p class="mt-6 text-lg leading-8">' + doc.intro + "</p>" +

      sections +

    "</article>"

  );

}



// "Download as PDF" opens the browser print dialog; choose "Save as PDF". The menus are hidden when printing.

document.addEventListener("click", function (event) {

  if (event.target.closest("[data-print]")) {

    window.print();

  }

});



// ---------- Routing: the part after # in the address decides what is shown ----------

function showSection(key) {

  const view = VIEWS[key];



  pageTitle.textContent = view.title;

  pageSubtitle.textContent = view.subtitle;

  headerInvite.hidden = Boolean(view.doc); // no Invite button on the legal views



  // Only the chosen view is visible. (The "hidden" property is used because some elements also have display classes.)

  views.forEach(function (element) {

    element.hidden = element.id !== "view-" + key;

  });



  if (view.doc) {

    document.getElementById("view-" + key).innerHTML = legalHTML(LEGAL[view.doc], "h2");

    document.title = LEGAL[view.doc].title + " | Stockwise Africa";

  } else {

    document.title = view.title + " | Stockwise Africa";

  }



  // Views that are built from data are rebuilt each time they open, so they are never out of date

  if (key === "teams") {

    renderMembers();

  }

  if (key === "permissions") {

    renderMemberCards();

    buildGroups(permGroups, permissionGroups, permState[selected.email]);

  }

  if (key === "notifications") {

    renderMemberCards();

    buildGroups(notifGroups, notificationGroups, notifState[selected.email]);

  }



  // Mark the active item in the Settings menu (the CSS draws the navy bar from aria-current)

  settingsLinks.forEach(function (link) {

    if (link.getAttribute("href") === "#" + view.menu) {

      link.setAttribute("aria-current", "page");

    } else {

      link.removeAttribute("aria-current");

    }

  });

}



// Logged-out view (teams.html#public-terms or #public-privacy)

function showPublic(key) {

  appShell.hidden = true;

  publicLegal.hidden = false;

  publicDoc.innerHTML = legalHTML(LEGAL[key], "h1");

  document.title = LEGAL[key].title + " | Stockwise Africa";

}

// ---------- Demo sign-in gate ----------
const loginForm = document.getElementById("login-form");
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginPanel = document.getElementById("login-panel");
const signupPanel = document.getElementById("signup-panel");
const signupForm = document.getElementById("signup-form");
const loginIsActive = () => sessionStorage.getItem("stockwiseAuthenticated") === "true";
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const clearAuthErrors = (panel) => {
  panel.querySelectorAll('[role="alert"]').forEach((node) => { node.textContent = ""; node.classList.add("hidden"); });
  panel.querySelectorAll("[aria-invalid='true']").forEach((input) => input.removeAttribute("aria-invalid"));
};
document.querySelectorAll("[data-auth-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    const showSignup = button.dataset.authMode === "signup";
    loginPanel.hidden = showSignup;
    signupPanel.hidden = !showSignup;
    clearAuthErrors(loginPanel);
    clearAuthErrors(signupPanel);
    (showSignup ? document.getElementById("signup-business") : loginEmail).focus();
  });
});
document.querySelectorAll("[data-password-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.passwordToggle);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.textContent = show ? "Hide" : "Show";
    button.setAttribute("aria-label", show ? "Hide password" : "Show password");
    button.setAttribute("aria-pressed", String(show));
  });
});
try {
  const rememberedEmail = localStorage.getItem("stockwiseRememberedEmail");
  if (rememberedEmail) {
    loginEmail.value = rememberedEmail;
    document.getElementById("login-remember").checked = true;
  }
} catch (error) {}

document.getElementById("login-toggle").addEventListener("click", () => {
  const show = loginPassword.type === "password";
  loginPassword.type = show ? "text" : "password";
  document.getElementById("login-toggle").setAttribute("aria-label", show ? "Hide password" : "Show password");
  document.getElementById("login-toggle").setAttribute("aria-pressed", String(show));
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = loginEmail.value.trim();
  const password = loginPassword.value;
  const emailError = document.getElementById("login-email-error");
  const passwordError = document.getElementById("login-password-error");
  const formError = document.getElementById("login-error");
  [emailError, passwordError, formError].forEach((node) => { node.textContent = ""; node.classList.add("hidden"); });
  [loginEmail, loginPassword].forEach((input) => input.removeAttribute("aria-invalid"));
  let valid = true;
  if (!email) {
    emailError.textContent = "Enter your email address.";
    emailError.classList.remove("hidden");
    loginEmail.setAttribute("aria-invalid", "true");
    valid = false;
  } else if (!validEmail(email)) {
    emailError.textContent = "Enter a valid email address.";
    emailError.classList.remove("hidden");
    loginEmail.setAttribute("aria-invalid", "true");
    valid = false;
  }
  if (!password) {
    passwordError.textContent = "Enter your password.";
    passwordError.classList.remove("hidden");
    loginPassword.setAttribute("aria-invalid", "true");
    valid = false;
  }
  if (!valid) return;
  try {
    let profile = null;
    try {
      const profiles = JSON.parse(localStorage.getItem("stockwiseDemoProfiles") || "{}");
      profile = profiles[email.toLowerCase()] || null;
    } catch (error) {}
    sessionStorage.setItem("stockwiseAuthenticated", "true");
    sessionStorage.setItem("stockwiseUser", JSON.stringify({ email, name: profile?.name || email.split("@")[0], business: profile?.business || "", phone: profile?.phone || "", role: profile?.role || "Owner" }));
    if (document.getElementById("login-remember").checked) localStorage.setItem("stockwiseRememberedEmail", email);
    else localStorage.removeItem("stockwiseRememberedEmail");
  } catch (error) {
    formError.textContent = "Your browser blocked sign-in storage. Allow site storage and try again.";
    formError.classList.remove("hidden");
    return;
  }
  loginPassword.value = "";
  location.hash = "home";
  route();
});

signupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearAuthErrors(signupPanel);
  const businessInput = document.getElementById("signup-business");
  const emailInput = document.getElementById("signup-email");
  const phoneInput = document.getElementById("signup-phone");
  const passwordInput = document.getElementById("signup-password");
  const confirmInput = document.getElementById("signup-confirm");
  const termsInput = document.getElementById("signup-terms");
  const business = businessInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();
  const phone = phoneInput.value.trim();
  const phoneDigits = phone.replace(/[\s()+-]/g, "");
  const password = passwordInput.value;
  const confirm = confirmInput.value;
  const showFieldError = (input, message) => {
    const node = document.getElementById(`${input.id}-error`);
    node.textContent = message;
    node.classList.remove("hidden");
    input.setAttribute("aria-invalid", "true");
  };
  let valid = true;
  if (!business) { showFieldError(businessInput, "Enter your business name."); valid = false; }
  if (!email) { showFieldError(emailInput, "Enter your email address."); valid = false; }
  else if (!validEmail(email)) { showFieldError(emailInput, "Enter a valid email address."); valid = false; }
  if (!phone) { showFieldError(phoneInput, "Enter your phone number."); valid = false; }
  else if (!/^\d{10,15}$/.test(phoneDigits)) { showFieldError(phoneInput, "Enter a valid phone number."); valid = false; }
  if (password.length < 8) { showFieldError(passwordInput, "Use a password with at least 8 characters."); valid = false; }
  if (!confirm) { showFieldError(confirmInput, "Confirm your password."); valid = false; }
  else if (confirm !== password) { showFieldError(confirmInput, "The passwords do not match."); valid = false; }
  if (!termsInput.checked) { showFieldError(termsInput, "Accept the Terms of Service and Privacy Policy to continue."); valid = false; }
  if (!valid) return;
  const formError = document.getElementById("signup-error");
  try {
    const profiles = JSON.parse(localStorage.getItem("stockwiseDemoProfiles") || "{}");
    if (profiles[email]) {
      showFieldError(emailInput, "An account with this email already exists. Log in instead.");
      return;
    }
    // This browser-only prototype stores the profile, never the password.
    const name = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
    profiles[email] = { name, email, business, phone, role: "Owner" };
    localStorage.setItem("stockwiseDemoProfiles", JSON.stringify(profiles));
    sessionStorage.setItem("stockwiseAuthenticated", "true");
    sessionStorage.setItem("stockwiseUser", JSON.stringify({ name, email, business, phone, role: "Owner" }));
  } catch (error) {
    formError.textContent = "Your browser blocked account storage. Allow site storage and try again.";
    formError.classList.remove("hidden");
    return;
  }
  signupForm.reset();
  location.hash = "home";
  route();
});



function route() {

  const hash = location.hash.slice(1);

  if (hash === "public-terms" || hash === "public-privacy") {
    loginScreen.hidden = true;
    showPublic(hash === "public-privacy" ? "privacy" : "terms");
    return;
  }

  if (!loginIsActive()) {
    loginScreen.hidden = false;
    appShell.hidden = true;
    publicLegal.hidden = true;
    document.title = "Log In | Stockwise Africa";
    return;
  }

  loginScreen.hidden = true;
  appShell.hidden = false;



  const inventoryApp = document.getElementById("inventory-app");
  const settingsMain = document.getElementById("settings-main");
  const dashboardApp = document.getElementById("dashboard-app");
  const salesApp = document.getElementById("sales-app");
  const alertsApp = document.getElementById("alerts-app");
  const reportsApp = document.getElementById("reports-app");
  dashboardApp.hidden = true;
  if (!hash || hash === "home" || hash === "login") {
    publicLegal.hidden = true;
    dashboardApp.hidden = false;
    inventoryApp.hidden = true;
    settingsMain.hidden = true;
    salesApp.hidden = true;
    alertsApp.hidden = true;
    reportsApp.hidden = true;
    document.title = "Home | Stockwise Africa";
    setSidebarOpen(false);
    updatePrimaryNav("home");
    renderDashboard();
    return;
  }
  dashboardApp.hidden = true;
  if (hash === "reports") {
    appShell.hidden = false;
    publicLegal.hidden = true;
    inventoryApp.hidden = true;
    settingsMain.hidden = true;
    salesApp.hidden = true;
    alertsApp.hidden = true;
    reportsApp.hidden = false;
    document.title = "Reports | Stockwise Africa";
    setSidebarOpen(false);
    updatePrimaryNav("reports");
    renderReports();
    return;
  }

  reportsApp.hidden = true;
  if (hash === "sales") {
    appShell.hidden = false;
    publicLegal.hidden = true;
    inventoryApp.hidden = true;
    settingsMain.hidden = true;
    alertsApp.hidden = true;
    salesApp.hidden = false;
    document.title = "Sales | Stockwise Africa";
    setSidebarOpen(false);
    updatePrimaryNav("sales");
    renderSaleProduct();
    renderSales();
    return;
  }

  salesApp.hidden = true;
  if (hash === "alerts") {
    appShell.hidden = false;
    publicLegal.hidden = true;
    inventoryApp.hidden = true;
    settingsMain.hidden = true;
    alertsApp.hidden = false;
    document.title = "Alerts | Stockwise Africa";
    setSidebarOpen(false);
    updatePrimaryNav("alerts");
    renderAlerts();
    return;
  }

  alertsApp.hidden = true;
  if (hash === "inventory") {
    appShell.hidden = false;
    publicLegal.hidden = true;
    inventoryApp.hidden = false;
    settingsMain.hidden = true;
    document.title = "Inventory | Stockwise Africa";
    setSidebarOpen(false);
    updatePrimaryNav("inventory");
    return;
  }

  inventoryApp.hidden = true;
  settingsMain.hidden = false;

  publicLegal.hidden = true;

  appShell.hidden = false;

  showSection(Object.hasOwn(VIEWS, hash) ? hash : "business");

  updatePrimaryNav("settings");
  setSidebarOpen(false);

}



// ---------- Business Info: logo upload ----------

document.getElementById("logo-button").addEventListener("click", function () {

  document.getElementById("logo-input").click();

});



document.getElementById("logo-input").addEventListener("change", function (event) {

  const file = event.target.files[0];

  if (!file) {

    return;

  }

  if (file.size > 2 * 1024 * 1024) {

    showStatus("Logo is larger than 2MB. Choose a smaller file.");

    event.target.value = "";

    return;

  }

  const image = document.createElement("img");

  image.src = URL.createObjectURL(file);

  image.alt = "Business logo";

  image.className = "h-full w-full object-cover";

  document.getElementById("logo-box").replaceChildren(image);

});



// ---------- Profile ----------

document.getElementById("avatar-button").addEventListener("click", function () {

  document.getElementById("avatar-input").click();

});



document.getElementById("avatar-input").addEventListener("change", function (event) {

  const file = event.target.files[0];

  if (!file) {

    return;

  }

  if (file.size > 2 * 1024 * 1024) {

    showStatus("Picture is larger than 2MB. Choose a smaller file.");

    event.target.value = "";

    return;

  }

  const image = document.createElement("img");

  image.src = URL.createObjectURL(file);

  image.alt = "Profile picture";

  image.className = "h-full w-full object-cover";

  document.getElementById("avatar-box").replaceChildren(image);

  showStatus("Profile picture updated");

});



const inName = document.getElementById("in-name");

const inEmail = document.getElementById("in-email");

const inPhone = document.getElementById("in-phone");



document.getElementById("edit-profile").addEventListener("click", function () {

  inName.focus();

});



document.getElementById("save-profile").addEventListener("click", function () {

  const name = inName.value.trim();

  const email = inEmail.value.trim();

  const phone = inPhone.value.trim();



  if (name === "" || !isValidEmail(email)) {

    showStatus("Enter a name and a valid email address.");

    return;

  }



  // Update every place the profile is shown

  document.getElementById("pv-name").textContent = name;

  document.getElementById("pv-email").textContent = email;

  document.getElementById("pv-phone").textContent = phone;

  document.getElementById("header-name").textContent = name;

  document.getElementById("header-contact").textContent = email + (phone ? " | " + phone : "");

  document.getElementById("topbar-name").textContent = name;

  showStatus("Profile saved");

});



// Show / hide password buttons

document.querySelectorAll(".eye").forEach(function (button) {

  button.addEventListener("click", function () {

    const input = button.parentElement.querySelector("input");

    const isHidden = input.type === "password";

    input.type = isHidden ? "text" : "password";

    button.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");

  });

});



document.getElementById("pw-form").addEventListener("submit", function (event) {

  event.preventDefault();



  const current = document.getElementById("pw0").value;

  const next = document.getElementById("pw1").value;

  const confirmation = document.getElementById("pw2").value;

  const error = document.getElementById("pw-error");

  let message = "";



  if (current === "") {

    message = "Enter your current password.";

  } else if (next.length < 8) {

    message = "New password must be at least 8 characters.";

  } else if (next !== confirmation) {

    message = "New passwords do not match.";

  }



  error.textContent = message;

  error.hidden = message === "";



  if (message === "") {

    event.target.reset();

    showStatus("Password updated");

  }

});



document.getElementById("delete-account").addEventListener("click", function () {

  if (confirm("Delete your account and all associated data? This cannot be undone.")) {

    showStatus("Account deletion requested");

  }

});



// ---------- Teams & Roles: members table ----------

const memberSearch = document.getElementById("member-search");

const roleFilter = document.getElementById("role-filter");

const memberBody = document.getElementById("member-body");



function renderMembers() {

  const query = memberSearch.value.trim().toLowerCase();

  const role = roleFilter.value;



  const rows = members.filter(function (member) {

    return (role === "All Roles" || member.role === role) &&

      (member.name.toLowerCase().includes(query) || member.email.toLowerCase().includes(query));

  });



  memberBody.innerHTML = rows.map(function (member) {

    const action = member.role === "Owner" ? "" :

      '<button type="button" data-edit="' + esc(member.email) + '" aria-label="Manage permissions for ' + esc(member.name) + '" class="inline-grid size-9 place-items-center rounded-[5px] hover:bg-navy/10 focus-visible:outline-2 focus-visible:outline-navy">' +

        '<svg class="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.800"/><circle cx="12" cy="12" r="1.800"/><circle cx="12" cy="19" r="1.800"/></svg>' +

      "</button>";



    return (

      '<tr class="border-b border-navy/10">' +

        '<td class="px-3 py-3"><div class="flex items-center gap-3">' +

          '<span class="grid size-10 shrink-0 place-items-center rounded-full bg-navy text-xs font-semibold text-white">' + esc(member.ini) + "</span>" +

          '<span><span class="block font-semibold">' + esc(member.name) + '</span><span class="block text-xs">' + esc(member.title) + "</span></span>" +

        "</div></td>" +

        '<td class="px-3 py-3">' + esc(member.email) + "</td>" +

        '<td class="px-3 py-3"><span class="rounded-[5px] px-2.5 py-1 text-xs font-semibold ' + roleBadge[member.role] + '">' + esc(member.role) + "</span></td>" +

        '<td class="px-3 py-3"><span class="' + (member.status === "Active" ? "text-green-700" : "text-navy/60") + '">● ' + esc(member.status) + "</span></td>" +

        '<td class="px-3 py-3 font-semibold">' + esc(member.last) + "</td>" +

        '<td class="px-3 py-3 text-right">' + action + "</td>" +

      "</tr>"

    );

  }).join("");



  document.getElementById("no-members").hidden = rows.length > 0 || members.length === 0;



  // No members at all: show the "No team members yet" empty state instead of the table

  document.getElementById("teams-empty").hidden = members.length > 0;

  document.getElementById("teams-content").hidden = members.length === 0;



  function countRole(name) {

    return members.filter(function (member) { return member.role === name; }).length;

  }

  document.getElementById("count-total").textContent = members.filter(function (member) { return member.status === "Active"; }).length;

  document.getElementById("count-owner").textContent = countRole("Owner");

  document.getElementById("count-manager").textContent = countRole("Manager");

  document.getElementById("count-attendant").textContent = countRole("Attendant");

}



memberSearch.addEventListener("input", renderMembers);

roleFilter.addEventListener("change", renderMembers);



// The ⋮ button on a row opens Custom Permissions for that member

memberBody.addEventListener("click", function (event) {

  const button = event.target.closest("[data-edit]");

  if (!button) {

    return;

  }

  selected = members.find(function (member) { return member.email === button.dataset.edit; });

  location.hash = "permissions";

});



// ---------- Member card (shown on Custom Permissions and Notifications) ----------

function renderMemberCards() {

  const html =

    '<div class="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">' +

      '<div class="flex items-center gap-4">' +

        '<span class="grid size-14 shrink-0 place-items-center rounded-full bg-navy text-base font-semibold text-white">' + esc(selected.ini) + "</span>" +

        "<div>" +

          '<p class="text-lg font-semibold">' + esc(selected.name) + "</p>" +

          '<span class="inline-block rounded-[5px] px-2 py-0.5 text-xs font-semibold ' + roleBadge[selected.role] + '">' + esc(selected.role) + "</span>" +

          '<p class="mt-1 text-sm">' + esc(selected.email) + (selected.phone ? " | " + esc(selected.phone) : "") + "</p>" +

        "</div>" +

      "</div>" +

      '<button type="button" data-change-role class="btn-outline">Change Role</button>' +

    "</div>";



  document.querySelectorAll(".member-card").forEach(function (container) {

    container.innerHTML = html;

  });

}



// One listener per card container (the buttons inside are recreated every time the card is drawn)

document.querySelectorAll(".member-card").forEach(function (container) {

  container.addEventListener("click", function (event) {

    if (!event.target.closest("[data-change-role]")) {

      return;

    }

    const roles = ["Manager", "Attendant"];

    const next = roles[(roles.indexOf(selected.role) + 1) % roles.length];

    selected.role = next;

    selected.title = next === "Manager" ? "Manager" : "Sales Attendant";

    renderMemberCards();

    renderMembers();

    showStatus(selected.name + " is now a " + next);

  });

});



// ---------- Accordion groups of toggle switches (permissions and notifications) ----------

const permGroups = document.getElementById("perm-groups");

const notifGroups = document.getElementById("notif-groups");



function buildGroups(target, groups, saved) {

  const state = saved || {};



  target.innerHTML = Object.entries(groups).map(function (entry) {

    const name = entry[0];

    const items = entry[1];



    const switches = items.map(function (item) {

      const key = name + "|" + item;

      return (

        '<label class="flex cursor-pointer items-center justify-between gap-4 text-sm font-medium">' +

          esc(item) +

          '<input type="checkbox" role="switch" class="switch" data-key="' + esc(key) + '"' + (state[key] !== false ? " checked" : "") + " />" +

        "</label>"

      );

    }).join("");



    return (

      '<div class="card">' +

        '<button type="button" class="acc-head flex w-full items-center justify-between rounded-[10px] px-5 py-4 text-left text-base font-semibold focus-visible:outline-2 focus-visible:outline-navy" aria-expanded="true">' +

          esc(name) +

          '<svg class="chev size-5 shrink-0 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>' +

        "</button>" +

        '<div class="acc-body flex flex-col gap-4 px-5 pb-5 pt-1">' + switches + "</div>" +

      "</div>"

    );

  }).join("");



  target.querySelectorAll(".acc-head").forEach(function (head) {

    head.addEventListener("click", function () {

      const body = head.nextElementSibling;

      body.hidden = !body.hidden;

      head.querySelector(".chev").classList.toggle("-rotate-90", body.hidden);

      head.setAttribute("aria-expanded", String(!body.hidden));

    });

  });

}



// Reads every switch in a group list as { "Group|Item": true/false }

function snapshot(target) {

  const result = {};

  target.querySelectorAll("[data-key]").forEach(function (toggle) {

    result[toggle.dataset.key] = toggle.checked;

  });

  return result;

}



document.getElementById("save-perms").addEventListener("click", function () {

  permState[selected.email] = snapshot(permGroups);

  showStatus("Permissions saved");

  location.hash = "teams";

});



document.getElementById("cancel-perms").addEventListener("click", function () {

  location.hash = "teams";

});



document.getElementById("save-notif").addEventListener("click", function () {

  notifState[selected.email] = snapshot(notifGroups);

  showStatus("Notification preferences saved");

});



document.getElementById("cancel-notif").addEventListener("click", function () {

  buildGroups(notifGroups, notificationGroups, notifState[selected.email]);

  showStatus("Changes discarded");

});



// ---------- Invite dialog ----------

function openInviteDialog() {

  inviteForm.reset();

  inviteError.classList.add("hidden");

  inviteSuccess.classList.add("hidden");

  inviteDialog.showModal(); // the browser handles the Escape key and focus trapping

  inviteEmail.focus();

}



function closeInviteDialog() {

  inviteDialog.close();

}



function handleInviteSubmit(event) {

  event.preventDefault(); // stop the form from reloading the page



  const email = inviteEmail.value.trim();

  inviteSuccess.classList.add("hidden");



  if (email === "") {

    inviteError.textContent = "Enter an email address.";

    inviteError.classList.remove("hidden");

    return;

  }

  if (!isValidEmail(email)) {

    inviteError.textContent = "Enter a valid email address, like name@company.com.";

    inviteError.classList.remove("hidden");

    return;

  }



  inviteError.classList.add("hidden");

  // No backend yet, so we only simulate the invitation and say so clearly.

  inviteSuccess.textContent =

    "Invitation prepared for " + email + " as " + inviteRole.value +

    ". This is a demo, so no email was actually sent.";

  inviteSuccess.classList.remove("hidden");

  inviteForm.reset();

  inviteRole.value = "Staff";

}



// Every Invite Team Member button shares the same data attribute

document.querySelectorAll("[data-open-invite]").forEach(function (button) {

  button.addEventListener("click", openInviteDialog);

});

document.getElementById("invite-close").addEventListener("click", closeInviteDialog);

document.getElementById("invite-cancel").addEventListener("click", closeInviteDialog);

inviteForm.addEventListener("submit", handleInviteSubmit);



// ---------- Top search ----------

// The top search is for products and has nothing to search yet, so we say so instead of inventing results.

topSearch.addEventListener("input", function () {

  const text = topSearch.value.trim();

  if (text !== "") {

    showStatus('No results for "' + text + '". Search is not connected in this demo.');

  } else {

    statusMessage.classList.add("hidden");

  }

});



// ---------- Notifications bell ----------

function closeNotifications() {

  notificationPanel.classList.add("hidden");

  notificationButton.setAttribute("aria-expanded", "false");

}



notificationButton.addEventListener("click", function () {

  const isOpen = notificationPanel.classList.toggle("hidden") === false;

  notificationButton.setAttribute("aria-expanded", String(isOpen));

});



// Click outside the panel closes it

document.addEventListener("click", function (event) {

  if (!notificationPanel.contains(event.target) && !notificationButton.contains(event.target)) {

    closeNotifications();

  }

});



// ---------- Shared Sidebar ----------

function updatePrimaryNav(active) {
  document.querySelectorAll("#sidebar .nav-link").forEach(function (link) {
    const href = link.getAttribute("href");
    const isActive = (active === "home" && href === "#home") ||
      (active === "inventory" && href === "#inventory") ||
      (active === "sales" && href === "#sales") ||
      (active === "alerts" && href === "#alerts") ||
      (active === "reports" && href === "#reports") ||
      (active === "settings" && href === "#business");

    link.classList.toggle("bg-white", isActive);
    link.classList.toggle("text-navy", isActive);
    link.classList.toggle("text-white", !isActive && link.id !== "logout-button");

    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function setSidebarOpen(isOpen) {

  sidebar.classList.toggle("-translate-x-full", !isOpen);

  sidebarOverlay.classList.toggle("hidden", !isOpen);

}



// Primary menu: real pages navigate normally; Home has no page yet.

document.querySelectorAll(".nav-link").forEach(function (link) {

  link.addEventListener("click", function (event) {

    if (link.getAttribute("href") === "#") {

      event.preventDefault();

      showStatus(link.dataset.page + " page is not implemented in this demo.");

      setSidebarOpen(false);

    }

  });

});



const settingsMenuButton = document.getElementById("menu-button");
if (settingsMenuButton) settingsMenuButton.addEventListener("click", function () { setSidebarOpen(true); });
const inventoryMenuButton = document.getElementById("inventory-menu-button");
if (inventoryMenuButton) inventoryMenuButton.addEventListener("click", function () { setSidebarOpen(true); });

sidebarOverlay.addEventListener("click", function () { setSidebarOpen(false); });



// Escape closes the notification panel and the mobile menu (the dialog closes itself)

document.addEventListener("keydown", function (event) {

  if (event.key === "Escape") {

    closeNotifications();

    setSidebarOpen(false);

  }

});



// ---------- Logout ----------

document.getElementById("logout-button").addEventListener("click", function () {
  try {
    sessionStorage.removeItem("stockwiseAuthenticated");
    sessionStorage.removeItem("stockwiseUser");
  } catch (error) {}
  location.hash = "login";
  route();
});



// ---------- Sales overview and record-sale flow ----------
const saleProducts = window.stockwiseProducts || [];
const salePayments = ["Cash", "Card", "Bank Transfer", "Other"];
const saleStaff = ["John Doe", "Alex Morgan", "Sarah Connor", "Mary Smith", "Jane Doe"];
const saleNaIra = (amount) => "₦" + Number(amount || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 });
const skuForProduct = (product) => "SKU" + String(product.id).padStart(3, "0");
const getSaleProduct = (sku) => saleProducts.find((product) => skuForProduct(product) === sku);
const getSalePrice = (product) => Number(product.price || 0);
const getSaleStock = (product) => Number(product.stock || 0);
const saleTimeZone = (() => {
  const zones = { Nigeria: "Africa/Lagos", Ghana: "Africa/Accra", Kenya: "Africa/Nairobi", "South Africa": "Africa/Johannesburg", Egypt: "Africa/Cairo", Ethiopia: "Africa/Addis_Ababa", Tanzania: "Africa/Dar_es_Salaam", Uganda: "Africa/Kampala", Rwanda: "Africa/Kigali", Morocco: "Africa/Casablanca", Senegal: "Africa/Dakar", "Côte d'Ivoire": "Africa/Abidjan", Cameroon: "Africa/Douala", Zambia: "Africa/Lusaka", Zimbabwe: "Africa/Harare", Algeria: "Africa/Algiers", Tunisia: "Africa/Tunis", Angola: "Africa/Luanda", Namibia: "Africa/Windhoek", Botswana: "Africa/Gaborone" };
  try { const country = (JSON.parse(sessionStorage.getItem("business")) || {}).country || "Nigeria"; return zones[country] || "Africa/Lagos"; }
  catch (error) { return "Africa/Lagos"; }
})();
const saleIsoDate = (date) => new Intl.DateTimeFormat("en-CA", { timeZone: saleTimeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const saleToday = () => saleIsoDate(new Date());
const saleUtc = (iso) => new Date(iso + "T00:00:00Z");
const saleAddDays = (iso, amount) => new Date(saleUtc(iso).getTime() + amount * 86400000).toISOString().slice(0, 10);
const saleDateLabel = (iso, options) => saleUtc(iso).toLocaleDateString("en-US", { ...(options || { month: "short", day: "numeric", year: "numeric" }), timeZone: "UTC" });
const saleFormatTime = (date) => new Intl.DateTimeFormat("en-GB", { timeZone: saleTimeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
const saleDaysBetween = (from, to) => Math.round((saleUtc(to) - saleUtc(from)) / 86400000);
const saleReadQueue = () => { try { return JSON.parse(localStorage.getItem("stockQueue") || "[]"); } catch (error) { return []; } };
const saleWriteQueue = (queue) => { try { localStorage.setItem("stockQueue", JSON.stringify(queue)); } catch (error) {} };

let saleRange = { from: saleAddDays(saleToday(), -6), to: saleToday() };
try {
  const savedRange = JSON.parse(localStorage.getItem("stockwiseSalesRange") || "null");
  if (savedRange && savedRange.from && savedRange.to && savedRange.to <= saleToday() && savedRange.to >= savedRange.from && saleDaysBetween(savedRange.from, savedRange.to) < 366) saleRange = savedRange;
} catch (error) {}

let salesQuery = "";
let salesPayment = "";
let salesStaffFilter = "";
let salesPage = 1;
let visibleSales = [];

function readRecordedSales() {
  return saleReadQueue().filter((movement) => movement.type === "sale").map((movement) => {
    const product = getSaleProduct(movement.productId);
    const created = new Date(movement.createdAt);
    return {
      id: String(movement.id),
      day: saleIsoDate(created),
      time: saleFormatTime(created),
      product: product ? product.name : (movement.productName || "Product"),
      qty: Number(movement.quantity),
      price: Number(movement.unitPrice),
      total: Number(movement.total),
      pay: movement.paymentMethod === "POS / Card" ? "Card" : (salePayments.includes(movement.paymentMethod) ? movement.paymentMethod : "Other"),
      by: movement.recordedBy || "John Doe",
      note: movement.note || "",
    };
  });
}

function salesForRange(from, to) {
  const existing = readRecordedSales().filter((sale) => sale.day >= from && sale.day <= to);
  const recordedDays = new Set(existing.map((sale) => sale.day));
  const demo = [];
  for (let day = from; day <= to; day = saleAddDays(day, 1)) {
    if (recordedDays.has(day) || !saleProducts.length) continue;
    const index = Math.abs(saleDaysBetween("2020-01-01", day));
    const product = saleProducts[index % saleProducts.length];
    const quantity = 1 + (index % 3);
    const price = getSalePrice(product);
    demo.push({
      id: "demo-" + day,
      day,
      time: String(8 + (index % 10)).padStart(2, "0") + ":" + String((index * 17) % 60).padStart(2, "0"),
      product: product.name,
      qty: quantity,
      price,
      total: quantity * price,
      pay: salePayments[index % salePayments.length],
      by: saleStaff[index % saleStaff.length],
      note: "Sample sales record",
    });
  }
  return [...existing, ...demo].sort((a, b) => (b.day + b.time).localeCompare(a.day + a.time));
}

function renderDashboard() {
  const rangeSelect = document.getElementById("dashboard-range");
  const rangeDays = rangeSelect.value === "today" ? 1 : Number(rangeSelect.value) || 7;
  const to = saleToday();
  const from = saleAddDays(to, -(rangeDays - 1));
  const rows = salesForRange(from, to);
  const total = rows.reduce((sum, sale) => sum + sale.total, 0);
  const units = rows.reduce((sum, sale) => sum + sale.qty, 0);
  const stockValue = saleProducts.reduce((sum, product) => sum + getSaleStock(product) * getSalePrice(product), 0);
  const lowStock = saleProducts.filter((product) => getSaleStock(product) > 0 && getSaleStock(product) <= Number(product.reorderLevel || 0));
  const outOfStock = saleProducts.filter((product) => getSaleStock(product) === 0).length;
  const user = (() => { try { return JSON.parse(sessionStorage.getItem("stockwiseUser") || "{}"); } catch (error) { return {}; } })();
  const fullName = String(user.name || user.email?.split("@")[0] || "John Doe").replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const firstName = fullName.split(/\s+/)[0] || "John";
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: saleTimeZone, hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  document.getElementById("dashboard-user-name").textContent = fullName;
  document.getElementById("dashboard-first-name").textContent = firstName;
  document.getElementById("dashboard-greeting").textContent = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  document.getElementById("dashboard-subtitle").textContent = rangeDays === 1 ? "Here’s what’s happening with your store today." : "Here’s what’s happening with your store in the last " + rangeDays + " days.";
  document.getElementById("dashboard-sales-total").textContent = saleNaIra(total);

  const stat = (label, value, note, dark) => '<li class="rounded-lg border p-4 ' + (dark ? 'border-[#17396b] bg-[#17396b] text-white' : 'border-slate-200 bg-white') + '"><p class="text-xs font-semibold">' + label + '</p><p class="mt-3 font-grotesk text-2xl font-bold ' + (dark ? '' : 'text-[#17396b]') + '">' + value + '</p><p class="mt-1 text-[10px] opacity-80">' + note + '</p></li>';
  document.getElementById("dashboard-stats").innerHTML =
    stat("Total Sales", saleNaIra(total), rangeDays === 1 ? "Today" : "Last " + rangeDays + " days", true) +
    stat("Products Sold", units.toLocaleString(), "Units sold in this period") +
    stat("Current Stock Value", saleNaIra(stockValue), saleProducts.length + " products in inventory") +
    stat("Low Stock Items", lowStock.length, outOfStock + " out of stock", false);

  const byDay = new Map();
  for (let day = from; day <= to; day = saleAddDays(day, 1)) byDay.set(day, 0);
  rows.forEach((sale) => byDay.set(sale.day, (byDay.get(sale.day) || 0) + sale.total));
  const points = [...byDay.entries()];
  const peak = Math.max(...points.map(([, amount]) => amount), 1);
  const chart = points.length ? '<div class="flex h-40 items-end gap-1 border-b border-slate-200 px-1">' + points.map(([day, amount]) => {
    const height = Math.max(amount ? 6 : 2, Math.round(amount / peak * 125));
    return '<div class="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"><span class="hidden whitespace-nowrap rounded bg-slate-800 px-1.5 py-1 text-[9px] text-white group-hover:block">' + saleDateLabel(day, { month: "short", day: "numeric" }) + ': ' + saleNaIra(amount) + '</span><div title="' + saleDateLabel(day) + ': ' + saleNaIra(amount) + '" class="w-full max-w-8 rounded-t bg-[#2358b8]" style="height:' + height + 'px"></div><span class="text-[8px] text-slate-500">' + (rangeDays <= 7 ? saleDateLabel(day, { weekday: "short" }) : saleDateLabel(day, { month: "short", day: "numeric" })) + '</span></div>';
  }).join("") + '</div>' : '<p class="py-12 text-center text-xs text-slate-500">No sales in this period.</p>';
  document.getElementById("dashboard-chart").innerHTML = chart;

  const statuses = [
    ["In Stock", saleProducts.filter((product) => getSaleStock(product) > Number(product.reorderLevel || 0)).length, "bg-[#17396b]"],
    ["Low Stock", lowStock.length, "bg-amber-500"],
    ["Out of Stock", outOfStock, "bg-rose-500"],
  ];
  const denominator = Math.max(saleProducts.length, 1);
  document.getElementById("dashboard-stock-status").innerHTML = statuses.map(([label, count, color]) =>
    '<div class="mb-3"><div class="mb-1 flex justify-between text-xs"><span>' + label + '</span><b>' + count + '</b></div><div class="h-2 overflow-hidden rounded-full bg-slate-100"><div class="h-full ' + color + '" style="width:' + Math.min(100, Math.round(count / denominator * 100)) + '%"></div></div></div>'
  ).join("") + '<p class="mt-3 text-[10px] text-slate-500">' + saleProducts.length + ' products total. Status is based on each product’s reorder level.</p>';

  document.getElementById("dashboard-recent-sales").innerHTML = rows.slice(0, 5).map((sale) =>
    '<tr data-dashboard-search="' + esc(sale.product.toLowerCase()) + '"><td class="px-2 py-2">' + saleDateLabel(sale.day, { month: "short", day: "numeric" }) + ', ' + esc(sale.time) + '</td><td class="px-2 py-2 font-medium">' + esc(sale.product) + '</td><td class="px-2 py-2">' + sale.qty + '</td><td class="px-2 py-2">' + saleNaIra(sale.total) + '</td></tr>'
  ).join("") || '<tr><td colspan="4" class="px-2 py-6 text-center text-slate-500">No sales in this period.</td></tr>';
  document.getElementById("dashboard-low-stock").innerHTML = lowStock.slice().sort((a, b) => getSaleStock(a) - getSaleStock(b)).slice(0, 5).map((product) =>
    '<tr data-dashboard-search="' + esc(product.name.toLowerCase()) + '"><td class="px-2 py-2 font-medium">' + esc(product.name) + '</td><td class="px-2 py-2">' + getSaleStock(product) + '</td><td class="px-2 py-2">' + Number(product.reorderLevel || 0) + '</td></tr>'
  ).join("") || '<tr><td colspan="3" class="px-2 py-6 text-center text-slate-500">Nothing is running low.</td></tr>';
  document.getElementById("dashboard-live").textContent = "Dashboard updated. " + rows.length + " sales shown, " + lowStock.length + " low stock items.";
  applyDashboardSearch();
}

function applyDashboardSearch() {
  const query = document.getElementById("dashboard-search").value.trim().toLowerCase();
  document.querySelectorAll("#dashboard-app [data-dashboard-search]").forEach((row) => {
    row.classList.toggle("hidden", query && !row.dataset.dashboardSearch.includes(query));
  });
}

document.getElementById("dashboard-range").addEventListener("change", renderDashboard);
document.getElementById("dashboard-search").addEventListener("input", applyDashboardSearch);
document.getElementById("dashboard-menu-button").addEventListener("click", () => setSidebarOpen(true));
document.getElementById("dashboard-notifications").addEventListener("click", () => { location.hash = "alerts"; });
document.getElementById("dashboard-add-sale").addEventListener("click", () => {
  renderSaleProduct();
  document.getElementById("done").classList.add("hidden");
  document.getElementById("sale-entry-dialog").showModal();
});

function renderSales() {
  const rowsBody = document.getElementById("sales-rows");
  if (!rowsBody) return;
  document.getElementById("range-label").textContent = saleDateLabel(saleRange.from) + " - " + saleDateLabel(saleRange.to);
  document.getElementById("tz-note").textContent = "Dates use your business time zone (" + saleTimeZone.replaceAll("_", " ") + ").";

  const allRows = salesForRange(saleRange.from, saleRange.to);
  const staffOptions = [...new Set(allRows.map((sale) => sale.by))].sort();
  if (salesStaffFilter && !staffOptions.includes(salesStaffFilter)) salesStaffFilter = "";
  const staffSelect = document.getElementById("staff");
  staffSelect.innerHTML = '<option value="">All Staff Member</option>' + staffOptions.map((name) => '<option value="' + esc(name) + '"' + (name === salesStaffFilter ? " selected" : "") + ">" + esc(name) + "</option>").join("");
  visibleSales = allRows.filter((sale) =>
    (!salesPayment || sale.pay === salesPayment) &&
    (!salesStaffFilter || sale.by === salesStaffFilter) &&
    (!salesQuery || (sale.product + " " + sale.by + " " + sale.pay).toLowerCase().includes(salesQuery))
  );

  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(visibleSales.length / pageSize));
  salesPage = Math.min(salesPage, pages);
  const pageRows = visibleSales.slice((salesPage - 1) * pageSize, salesPage * pageSize);
  const paymentStyles = { Cash: "bg-slate-100 text-slate-700", Card: "bg-orange-100 text-orange-700", "Bank Transfer": "bg-indigo-100 text-indigo-700", Other: "bg-rose-100 text-rose-700" };
  rowsBody.innerHTML = pageRows.length ? pageRows.map((sale) =>
    '<tr><td class="px-4 py-3.5 font-medium">' + saleDateLabel(sale.day, { month: "short", day: "numeric" }) + ", " + esc(sale.time) + "</td>" +
    '<td class="px-4 py-3.5 font-medium">' + esc(sale.product) + '</td><td class="px-4 py-3.5">' + esc(sale.qty) + "</td>" +
    '<td class="px-4 py-3.5">' + saleNaIra(sale.price) + '</td><td class="px-4 py-3.5">' + saleNaIra(sale.total) + "</td>" +
    '<td class="px-4 py-3.5"><span class="rounded px-2.5 py-1 text-[10px] font-semibold ' + paymentStyles[sale.pay] + '">' + esc(sale.pay) + "</span></td>" +
    '<td class="px-4 py-3.5 font-medium">' + esc(sale.by) + '</td><td class="px-4 py-3.5 text-right"><button type="button" data-sale-detail="' + esc(sale.id) + '" aria-label="View sale details" class="px-2 text-base">⋮</button></td></tr>'
  ).join("") : '<tr><td colspan="8" class="px-4 py-10 text-center text-xs text-slate-500">No sales match your filters.</td></tr>';

  const count = document.getElementById("sales-count");
  const start = (salesPage - 1) * pageSize;
  count.textContent = visibleSales.length ? "Showing " + (start + 1) + "-" + (start + pageRows.length) + " of " + visibleSales.length + " record" + (visibleSales.length === 1 ? "" : "s") : "Showing 0 records";
  const pager = document.getElementById("sales-pager");
  pager.innerHTML = Array.from({ length: pages }, (_, index) => index + 1).map((page) =>
    '<button type="button" data-sales-page="' + page + '" ' + (page === salesPage ? 'aria-current="page"' : "") + ' class="flex h-7 min-w-7 items-center justify-center rounded border px-2 ' + (page === salesPage ? "border-[#17396b] bg-[#17396b] text-white" : "border-slate-300") + '">' + page + "</button>"
  ).join("");
}

function updateSaleProductDetails() {
  const select = document.getElementById("sale-product");
  if (!select) return;
  const product = getSaleProduct(select.value) || saleProducts.find((item) => getSaleStock(item) > 0);
  if (!product) {
    document.getElementById("p-stock").textContent = "0";
    document.getElementById("p-sell").textContent = "—";
    select.value = "";
    return;
  }
  select.value = skuForProduct(product);
  document.getElementById("p-stock").textContent = getSaleStock(product);
  document.getElementById("p-sell").textContent = saleNaIra(getSalePrice(product));
  document.getElementById("price").value = getSalePrice(product);
}

function renderSaleProduct() {
  const select = document.getElementById("sale-product");
  if (!select) return;
  const current = select.value;
  select.innerHTML = saleProducts.map((product) => {
    const sku = skuForProduct(product);
    return '<option value="' + sku + '"' + (getSaleStock(product) <= 0 ? " disabled" : "") + ">" + esc(product.name) + " — " + getSaleStock(product) + " in stock</option>";
  }).join("");
  if (current && getSaleProduct(current) && getSaleStock(getSaleProduct(current)) > 0) select.value = current;
  updateSaleProductDetails();
}

document.getElementById("record-sale-open").addEventListener("click", () => {
  renderSaleProduct();
  document.getElementById("done").classList.add("hidden");
  document.getElementById("sale-entry-dialog").showModal();
});
document.getElementById("sale-product").addEventListener("change", updateSaleProductDetails);
document.getElementById("cancel").addEventListener("click", () => document.getElementById("sale-entry-dialog").close());
document.getElementById("sale-cancel").addEventListener("click", () => document.getElementById("sale-entry-dialog").close());
document.getElementById("sale").addEventListener("submit", (event) => {
  event.preventDefault();
  ["qty", "price", "payment"].forEach((id) => {
    document.getElementById(id).removeAttribute("aria-invalid");
    document.getElementById(id + "-error").classList.add("hidden");
  });
  const done = document.getElementById("done");
  done.classList.add("hidden");
  const product = getSaleProduct(document.getElementById("sale-product").value);
  const quantityInput = document.getElementById("qty").value;
  const quantity = Number(quantityInput);
  const priceInput = document.getElementById("price").value;
  const price = priceInput === "" ? getSalePrice(product || {}) : Number(priceInput);
  const payment = document.getElementById("payment").value;
  let valid = true;
  const fail = (field, message) => {
    const error = document.getElementById(field + "-error");
    error.textContent = message;
    error.classList.remove("hidden");
    document.getElementById(field).setAttribute("aria-invalid", "true");
    valid = false;
  };
  if (!product) fail("qty", "Choose a product with stock available.");
  if (!quantityInput || !Number.isInteger(quantity) || quantity < 1) fail("qty", "Enter a whole number of 1 or more.");
  else if (product && quantity > getSaleStock(product)) fail("qty", getSaleStock(product) ? "Only " + getSaleStock(product) + " units are in stock." : "This product is out of stock.");
  if (!Number.isFinite(price) || price < 0) fail("price", "Enter a valid price of 0 or more.");
  if (!payment) fail("payment", "Select a payment method.");
  if (!valid) {
    const firstInvalid = document.querySelector('#sale [aria-invalid="true"]');
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  const stock = getSaleStock(product) - quantity;
  product.stock = stock;
  const sku = skuForProduct(product);
  const id = window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(16).slice(2);
  try { localStorage.setItem("stock:" + sku, String(stock)); } catch (error) {}
  saleWriteQueue([...saleReadQueue(), {
    id,
    type: "sale",
    productId: sku,
    productName: product.name,
    quantity,
    unitPrice: price,
    total: quantity * price,
    paymentMethod: payment,
    note: document.getElementById("note").value.trim() || null,
    createdAt: new Date().toISOString(),
    recordedBy: "John Doe",
    synced: false,
  }]);
  if (typeof window.stockwiseRenderInventory === "function") window.stockwiseRenderInventory();
  renderSaleProduct();
  renderSales();
  done.textContent = "Sale recorded. " + quantity + " " + (quantity === 1 ? "unit" : "units") + " of " + product.name + " sold for " + saleNaIra(quantity * price) + ". Stock updated to " + stock + ".";
  done.classList.remove("hidden");
  document.getElementById("qty").value = 1;
  document.getElementById("payment").value = "";
  document.getElementById("note").value = "";
  showStatus("Sale recorded and inventory updated");
});

document.getElementById("q").addEventListener("input", (event) => { salesQuery = event.target.value.trim().toLowerCase(); salesPage = 1; renderSales(); });
document.getElementById("pay").addEventListener("change", (event) => { salesPayment = event.target.value; salesPage = 1; renderSales(); });
document.getElementById("staff").addEventListener("change", (event) => { salesStaffFilter = event.target.value; salesPage = 1; renderSales(); });
document.getElementById("sales-pager").addEventListener("click", (event) => {
  const button = event.target.closest("[data-sales-page]");
  if (button) { salesPage = Number(button.dataset.salesPage); renderSales(); }
});
document.getElementById("sales-rows").addEventListener("click", (event) => {
  const button = event.target.closest("[data-sale-detail]");
  if (!button) return;
  const sale = visibleSales.find((item) => item.id === button.dataset.saleDetail);
  if (!sale) return;
  const detailLine = (label, value) => '<div class="flex justify-between gap-4 py-2"><dt class="text-slate-600">' + label + '</dt><dd class="text-right font-medium">' + value + "</dd></div>";
  document.getElementById("sale-detail-body").innerHTML = detailLine("Date", saleDateLabel(sale.day)) + detailLine("Time", esc(sale.time)) + detailLine("Product", esc(sale.product)) + detailLine("Quantity", sale.qty) + detailLine("Unit price", saleNaIra(sale.price)) + detailLine("Total amount", saleNaIra(sale.total)) + detailLine("Payment method", esc(sale.pay)) + detailLine("Recorded by", esc(sale.by)) + (sale.note ? detailLine("Note", esc(sale.note)) : "");
  document.getElementById("sale-detail-dialog").showModal();
});
document.getElementById("sale-detail-close").addEventListener("click", () => document.getElementById("sale-detail-dialog").close());
document.getElementById("sale-detail-dialog").addEventListener("click", (event) => { if (event.target === event.currentTarget) event.currentTarget.close(); });

function setSalesRange(from, to) {
  saleRange = { from, to };
  try { localStorage.setItem("stockwiseSalesRange", JSON.stringify(saleRange)); } catch (error) {}
  salesPage = 1;
  renderSales();
}

function salesPreset(key) {
  const today = saleToday();
  const monthStart = today.slice(0, 8) + "01";
  if (key === "today") return [today, today];
  if (key === "7") return [saleAddDays(today, -6), today];
  if (key === "30") return [saleAddDays(today, -29), today];
  if (key === "month") return [monthStart, today];
  if (key === "last") { const end = saleAddDays(monthStart, -1); return [end.slice(0, 8) + "01", end]; }
  return [today.slice(0, 4) + "-01-01", today];
}

const salesRangePanel = document.getElementById("range-panel");
const salesRangeButton = document.getElementById("range-btn");
function openSalesRange(open) {
  salesRangePanel.classList.toggle("hidden", !open);
  salesRangeButton.setAttribute("aria-expanded", String(open));
  if (open) {
    document.getElementById("from").value = saleRange.from;
    document.getElementById("to").value = saleRange.to;
    document.getElementById("from").max = saleToday();
    document.getElementById("to").max = saleToday();
    document.getElementById("range-error").classList.add("hidden");
  }
}
document.getElementById("presets").innerHTML = [["today", "Today"], ["7", "Last 7 days"], ["30", "Last 30 days"], ["month", "This month"], ["last", "Last month"], ["year", "This year"]].map(([key, label]) => '<button type="button" data-sales-preset="' + key + '" class="rounded-md border border-slate-200 px-2 py-1.5 text-left hover:bg-slate-50">' + label + "</button>").join("");
document.getElementById("tz-note").textContent = "Dates use your business time zone (" + saleTimeZone.replaceAll("_", " ") + ").";
salesRangeButton.addEventListener("click", () => openSalesRange(salesRangePanel.classList.contains("hidden")));
document.getElementById("range-cancel").addEventListener("click", () => openSalesRange(false));
document.getElementById("presets").addEventListener("click", (event) => {
  const button = event.target.closest("[data-sales-preset]");
  if (!button) return;
  setSalesRange(...salesPreset(button.dataset.salesPreset));
  openSalesRange(false);
});
document.getElementById("range-apply").addEventListener("click", () => {
  const from = document.getElementById("from").value;
  const to = document.getElementById("to").value;
  const error = document.getElementById("range-error");
  const message = !from || !to ? "Choose both a start date and an end date." : to < from ? "The end date must be on or after the start date." : to > saleToday() ? "The end date cannot be in the future." : saleDaysBetween(from, to) >= 366 ? "Choose a range of 366 days or fewer." : "";
  if (message) { error.textContent = message; error.classList.remove("hidden"); return; }
  setSalesRange(from, to);
  openSalesRange(false);
});
document.addEventListener("click", (event) => {
  if (salesRangePanel && !salesRangePanel.classList.contains("hidden") && !event.target.closest("#range-panel, #range-btn")) openSalesRange(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && salesRangePanel && !salesRangePanel.classList.contains("hidden")) openSalesRange(false);
});

// ---------- Reports ----------
const reportTabs = [
  ["overview", "Overview"],
  ["sales", "Sales"],
  ["inventory", "Inventory"],
  ["stock", "Stock Management"],
  ["low", "Low Stock"],
  ["expiring", "Expiring Soon"],
];
let activeReportTab = "overview";
let reportRange = { from: saleRange.from, to: saleRange.to };
let reportData = null;
const reportColors = ["#17396b", "#f6a54a", "#7c7cf0", "#ef5350"];

function reportAggregate(rows, keyFn) {
  const values = new Map();
  rows.forEach((row) => {
    const key = keyFn(row);
    const aggregate = values.get(key) || { name: key, qty: 0, total: 0 };
    aggregate.qty += row.qty;
    aggregate.total += row.total;
    values.set(key, aggregate);
  });
  return [...values.values()].sort((a, b) => b.total - a.total);
}

function renderReportTabs() {
  document.getElementById("reports-tabs").innerHTML = reportTabs.map(([key, label]) =>
    '<button type="button" role="tab" data-report-tab="' + key + '" aria-selected="' + (activeReportTab === key) + '" class="whitespace-nowrap rounded px-5 py-2 text-[10px] font-semibold ' +
    (activeReportTab === key ? "bg-[#17396b] text-white" : "text-slate-700 hover:bg-white/60") + '">' + label + "</button>"
  ).join("");
}

function reportChart(rows) {
  if (!rows.length) return '<p class="py-16 text-center text-xs text-slate-500">No sales in this date range.</p>';
  const byDay = new Map();
  rows.forEach((row) => byDay.set(row.day, (byDay.get(row.day) || 0) + row.total));
  const data = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-30);
  const width = 560, height = 190, left = 55, right = 12, top = 10, bottom = 28;
  const max = Math.max(...data.map((item) => item[1]), 1);
  const points = data.map((item, index) => [
    data.length === 1 ? (left + width - right) / 2 : left + index * (width - left - right) / (data.length - 1),
    top + (height - top - bottom) * (1 - item[1] / max),
  ]);
  const path = points.map((point, index) => (index ? "L" : "M") + point[0] + "," + point[1]).join(" ");
  const grid = [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
    const y = top + (height - top - bottom) * (1 - fraction);
    return '<line x1="' + left + '" x2="' + (width - right) + '" y1="' + y + '" y2="' + y + '" stroke="#e5e7eb"/>' +
      '<text x="' + (left - 5) + '" y="' + (y + 3) + '" text-anchor="end" font-size="8" fill="#667085">' + (fraction ? saleNaIra(max * fraction) : "₦0") + "</text>";
  }).join("");
  const labels = data.filter((_, index) => index === 0 || index === data.length - 1 || index % Math.max(1, Math.ceil(data.length / 6)) === 0).map((item) => {
    const index = data.indexOf(item);
    return '<text x="' + points[index][0] + '" y="' + (height - 8) + '" text-anchor="middle" font-size="8" fill="#667085">' + saleDateLabel(item[0], { month: "short", day: "numeric" }) + "</text>";
  }).join("");
  const dots = points.map((point) => '<circle cx="' + point[0] + '" cy="' + point[1] + '" r="2.5" fill="#17396b"/>').join("");
  return '<svg viewBox="0 0 ' + width + " " + height + '" class="w-full" role="img" aria-label="Sales revenue from ' + saleDateLabel(reportRange.from) + " to " + saleDateLabel(reportRange.to) + '">' +
    grid + '<path d="' + path + '" fill="none" stroke="#17396b" stroke-width="2"/>' + dots + labels + "</svg>";
}

function reportDonut(rows) {
  const amounts = salePayments.map((payment) => rows.filter((row) => row.pay === payment).reduce((total, row) => total + row.total, 0));
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  if (!total) return '<p class="py-16 text-center text-xs text-slate-500">No sales in this date range.</p>';
  const circumference = 2 * Math.PI * 58;
  let offset = 0;
  const rings = amounts.map((amount, index) => {
    const length = amount / total * circumference;
    const ring = '<circle r="58" cx="80" cy="80" fill="none" stroke="' + reportColors[index] + '" stroke-width="22" stroke-dasharray="' + length + " " + (circumference - length) + '" stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 80 80)"/>';
    offset += length;
    return ring;
  }).join("");
  const legend = salePayments.map((payment, index) =>
    '<li class="flex items-center gap-2 text-[11px]"><span class="h-2.5 w-2.5 rounded-full" style="background:' + reportColors[index] + '"></span><span class="w-24">' + payment + '</span><strong>' + Math.round(amounts[index] / total * 100) + '%</strong></li>'
  ).join("");
  return '<svg viewBox="0 0 160 160" class="h-40 w-40" role="img" aria-label="Sales by payment method"><circle r="58" cx="80" cy="80" fill="none" stroke="#f1f5f9" stroke-width="22"/>' + rings +
    '<text x="80" y="78" text-anchor="middle" font-size="13" font-weight="700" fill="#17396b">' + saleNaIra(total) + '</text><text x="80" y="93" text-anchor="middle" font-size="8" fill="#667085">Total Sales</text></svg><ul class="space-y-3">' + legend + "</ul>";
}

function reportStatus(product) {
  const key = window.stockwiseProductStatus(product);
  return key === "out" ? "Out of stock" : key === "low" ? "Low stock" : key === "expiring" ? "Expiring soon" : "In stock";
}

function renderReportOtherPanel() {
  const overview = document.getElementById("reports-overview-panel");
  const panel = document.getElementById("reports-other-panel");
  const tab = reportTabs.find((item) => item[0] === activeReportTab);
  const isOverview = activeReportTab === "overview";
  overview.classList.toggle("hidden", !isOverview);
  panel.classList.toggle("hidden", isOverview);
  if (isOverview) return;

  if (activeReportTab === "sales") {
    panel.innerHTML = '<h2 class="font-grotesk text-lg font-bold text-[#17396b]">Sales Report</h2><p class="mt-1 text-slate-600">Explore and filter every sale recorded in the selected dates.</p><a href="#sales" class="mt-4 inline-flex min-h-9 items-center rounded-md bg-[#17396b] px-4 font-semibold text-white">Open Sales →</a>';
    return;
  }
  if (activeReportTab === "stock") {
    panel.innerHTML = '<h2 class="font-grotesk text-lg font-bold text-[#17396b]">Stock Management Report</h2><p class="mt-1 text-slate-600">Review stock levels and products that need attention.</p><a href="#inventory" class="mt-4 inline-flex min-h-9 items-center rounded-md bg-[#17396b] px-4 font-semibold text-white">Open Inventory →</a>';
    return;
  }
  const products = saleProducts.filter((product) => {
    const status = window.stockwiseProductStatus(product);
    return activeReportTab === "inventory" ||
      (activeReportTab === "low" && status === "low") ||
      (activeReportTab === "expiring" && status === "expiring");
  });
  const title = tab ? tab[1] : "Inventory";
  panel.innerHTML = '<h2 class="font-grotesk text-lg font-bold text-[#17396b]">' + title + " Report</h2>" +
    '<div class="mt-3 overflow-x-auto"><table class="w-full min-w-[520px] text-left text-[11px]"><thead class="bg-slate-100"><tr><th class="px-3 py-2">Product</th><th class="px-3 py-2">Category</th><th class="px-3 py-2">Current stock</th><th class="px-3 py-2">Status</th></tr></thead><tbody class="divide-y divide-slate-100">' +
    (products.length ? products.map((product) => '<tr><td class="px-3 py-2.5 font-medium">' + esc(product.name) + '</td><td class="px-3 py-2.5">' + esc(product.category) + '</td><td class="px-3 py-2.5">' + product.stock + '</td><td class="px-3 py-2.5">' + reportStatus(product) + "</td></tr>").join("") :
      '<tr><td colspan="4" class="px-3 py-8 text-center text-slate-500">No products in this report.</td></tr>') +
    "</tbody></table></div>";
}

function renderReports() {
  const stats = document.getElementById("reports-stats");
  if (!stats) return;
  const rows = salesForRange(reportRange.from, reportRange.to);
  const revenue = rows.reduce((sum, row) => sum + row.total, 0);
  const units = rows.reduce((sum, row) => sum + row.qty, 0);
  const average = rows.length ? revenue / rows.length : 0;
  const topProducts = reportAggregate(rows, (row) => row.product).slice(0, 5);
  const categories = reportAggregate(rows, (row) => {
    const product = saleProducts.find((item) => item.name === row.product);
    return product ? product.category : "Other";
  });
  const allProducts = saleProducts;
  const counts = { in: 0, low: 0, out: 0, expiring: 0 };
  allProducts.forEach((product) => { counts[window.stockwiseProductStatus(product)] += 1; });
  const card = (title, value, icon) => '<li class="rounded-lg border border-slate-200 bg-white p-4"><p class="flex items-center gap-2 text-xs font-semibold"><span class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[#17396b]">' + icon + "</span>" + title + '</p><p class="font-grotesk mt-3 text-2xl font-bold text-[#17396b]">' + value + "</p></li>";
  stats.innerHTML = card("Total Sales", saleNaIra(revenue), "₦") +
    card("Total Products Sold", units.toLocaleString("en-NG"), "▦") +
    card("Average Order Value", saleNaIra(average), "◷") +
    card("Low Stock Items", counts.low + counts.out, "!");

  document.getElementById("reports-range-label").textContent = saleDateLabel(reportRange.from) + " - " + saleDateLabel(reportRange.to);
  const chartRange = document.getElementById("reports-chart-range");
  const rangeLength = saleDaysBetween(reportRange.from, reportRange.to) + 1;
  chartRange.value = reportRange.to === saleToday() && [7, 30, 90].includes(rangeLength) ? String(rangeLength) : "custom";
  document.getElementById("reports-chart").innerHTML = reportChart(rows);
  document.getElementById("reports-donut").innerHTML = reportDonut(rows);
  document.getElementById("reports-top").innerHTML = topProducts.length
    ? topProducts.map((product) => '<tr><td class="px-3 py-2.5 font-medium">' + esc(product.name) + '</td><td class="px-3 py-2.5">' + product.qty + '</td><td class="px-3 py-2.5">' + saleNaIra(product.total) + '</td><td class="px-3 py-2.5">' + (revenue ? Math.round(product.total / revenue * 100) : 0) + "%</td></tr>").join("")
    : '<tr><td colspan="4" class="px-3 py-8 text-center text-slate-500">No sales in this date range.</td></tr>';
  document.getElementById("reports-cats").innerHTML = categories.length
    ? categories.map((category) => '<tr><td class="px-3 py-2.5 font-medium">' + esc(category.name) + '</td><td class="px-3 py-2.5">' + category.qty + '</td><td class="px-3 py-2.5">' + saleNaIra(category.total) + "</td></tr>").join("")
    : '<tr><td colspan="3" class="px-3 py-8 text-center text-slate-500">No sales in this date range.</td></tr>';
  renderReportTabs();
  renderReportOtherPanel();
}

document.getElementById("reports-tabs").addEventListener("click", (event) => {
  const button = event.target.closest("[data-report-tab]");
  if (!button) return;
  activeReportTab = button.dataset.reportTab;
  renderReports();
});

function reportPreset(key) {
  const today = saleToday();
  const start = today.slice(0, 8) + "01";
  if (key === "today") return [today, today];
  if (key === "7") return [saleAddDays(today, -6), today];
  if (key === "30") return [saleAddDays(today, -29), today];
  if (key === "90") return [saleAddDays(today, -89), today];
  if (key === "month") return [start, today];
  if (key === "last") { const end = saleAddDays(start, -1); return [end.slice(0, 8) + "01", end]; }
  return [today.slice(0, 4) + "-01-01", today];
}

function setReportRange(from, to) {
  reportRange = { from, to };
  try { sessionStorage.setItem("reportsRange", JSON.stringify(reportRange)); } catch (error) {}
  renderReports();
}
try {
  const saved = JSON.parse(sessionStorage.getItem("reportsRange") || "null");
  if (saved && saved.from && saved.to && saved.to <= saleToday() && saved.to >= saved.from && saleDaysBetween(saved.from, saved.to) < 366) reportRange = saved;
} catch (error) {}

const reportsRangePanel = document.getElementById("reports-range-panel");
const reportsRangeButton = document.getElementById("reports-range-btn");
function openReportsRange(open) {
  reportsRangePanel.classList.toggle("hidden", !open);
  reportsRangeButton.setAttribute("aria-expanded", String(open));
  if (open) {
    document.getElementById("reports-from").value = reportRange.from;
    document.getElementById("reports-to").value = reportRange.to;
    document.getElementById("reports-from").max = saleToday();
    document.getElementById("reports-to").max = saleToday();
    document.getElementById("reports-range-error").classList.add("hidden");
  }
}
document.getElementById("reports-presets").innerHTML = [["today", "Today"], ["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"], ["month", "This month"], ["last", "Last month"], ["year", "This year"]].map(([key, label]) => '<button type="button" data-report-preset="' + key + '" class="rounded-md border border-slate-200 px-2 py-1.5 text-left hover:bg-slate-50">' + label + "</button>").join("");
document.getElementById("reports-tz-note").textContent = "Dates use your business time zone (" + saleTimeZone.replaceAll("_", " ") + ").";
reportsRangeButton.addEventListener("click", () => openReportsRange(reportsRangePanel.classList.contains("hidden")));
document.getElementById("reports-range-cancel").addEventListener("click", () => openReportsRange(false));
document.getElementById("reports-presets").addEventListener("click", (event) => {
  const button = event.target.closest("[data-report-preset]");
  if (!button) return;
  setReportRange(...reportPreset(button.dataset.reportPreset));
  openReportsRange(false);
});
document.getElementById("reports-range-apply").addEventListener("click", () => {
  const from = document.getElementById("reports-from").value;
  const to = document.getElementById("reports-to").value;
  const error = document.getElementById("reports-range-error");
  const message = !from || !to ? "Choose both a start and end date." : to < from ? "The end date must be on or after the start date." : to > saleToday() ? "The end date cannot be in the future." : saleDaysBetween(from, to) >= 366 ? "Choose a range of 366 days or fewer." : "";
  if (message) { error.textContent = message; error.classList.remove("hidden"); return; }
  setReportRange(from, to);
  openReportsRange(false);
});
document.getElementById("reports-chart-range").addEventListener("change", (event) => {
  if (event.target.value === "custom") { openReportsRange(true); return; }
  setReportRange(...reportPreset(event.target.value));
});
document.getElementById("reports-export").addEventListener("click", () => {
  const rows = salesForRange(reportRange.from, reportRange.to);
  const revenue = rows.reduce((sum, row) => sum + row.total, 0);
  const units = rows.reduce((sum, row) => sum + row.qty, 0);
  const top = reportAggregate(rows, (row) => row.product);
  const categories = reportAggregate(rows, (row) => {
    const product = saleProducts.find((item) => item.name === row.product);
    return product ? product.category : "Other";
  });
  const quote = (value) => '"' + String(value).replace(/"/g, '""') + '"';
  const lines = [["Stockwise Africa Report", reportRange.from + " to " + reportRange.to], [], ["Total sales", revenue], ["Transactions", rows.length], ["Products sold (units)", units], ["Average order value", rows.length ? Math.round(revenue / rows.length) : 0], [], ["Top selling products"], ["Product", "Quantity sold", "Total sales"], ...top.map((row) => [row.name, row.qty, row.total]), [], ["Sales by category"], ["Category", "Quantity sold", "Total sales"], ...categories.map((row) => [row.name, row.qty, row.total]), [], ["Sales by payment method"], ["Method", "Total sales"], ...salePayments.map((payment) => [payment, rows.filter((row) => row.pay === payment).reduce((sum, row) => sum + row.total, 0)])];
  const csv = lines.map((row) => row.map(quote).join(",")).join("\r\n");
  const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" })), download: "stockwise-report-" + reportRange.from + "-to-" + reportRange.to + ".csv" });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});
document.getElementById("reports-menu-button").addEventListener("click", () => setSidebarOpen(true));

// ---------- Alerts ----------
// Prototype alert records. Replace these with live inventory events when the
// app is connected to its shared data source.
const alertRecords = [
  { sku: "SKU001", name: "Amoxicillin 250mg", status: "Low Stock", detail: "8 left", time: "Oct 3, 9:12 AM", image: "images/amoxicillin.png" },
  { sku: "SKU002", name: "Loratadine 10mg", status: "Out of Stock", detail: "", time: "Oct 3, 8:47 AM", image: "images/loratadine.png" },
  { sku: "SKU003", name: "Hydrogen Peroxide", status: "Expiring Soon", detail: "Expires in 5 days", time: "Oct 3, 8:21 AM", image: "images/hydrogen-peroxide.png" },
  { sku: "SKU004", name: "Ibuprofen 400mg", status: "Low Stock", detail: "12 left", time: "Oct 3, 7:56 AM", image: "images/ibuprofen.png" },
  { sku: "SKU005", name: "Diclofenac Gel", status: "Sync Issue", detail: "Sales and inventory sync delayed", time: "Oct 3, 7:32 AM", image: "images/diclofenac-gel.png" },
  { sku: "SKU006", name: "Oral Rehydration Salts", status: "Expiring Soon", detail: "Expires in 5 days", time: "Oct 3, 7:10 AM", image: "images/oral-rehydration-salts.png" },
  { sku: "SKU007", name: "Multivitamin Syrup", status: "Low Stock", detail: "5 left", time: "Oct 3, 6:48 AM", image: "images/multivitamin-syrup.png" },
  { sku: "SKU008", name: "Paracetamol 500mg", status: "Low Stock", detail: "9 left", time: "Oct 3, 6:22 AM", image: "images/paracetamol.png" },
  { sku: "SKU009", name: "Cetirizine 10mg", status: "Out of Stock", detail: "", time: "Oct 3, 6:05 AM", image: "images/cetirizine.png" },
  { sku: "SKU010", name: "Cough Syrup 100ml", status: "Expiring Soon", detail: "Expires in 3 days", time: "Oct 2, 5:44 PM", image: "images/cough-syrup.png" },
  { sku: "SKU011", name: "Vitamin C 1000mg", status: "Low Stock", detail: "6 left", time: "Oct 2, 5:16 PM", image: "images/vitamin-c.png" },
  { sku: "SKU012", name: "Insulin Syringes", status: "Out of Stock", detail: "", time: "Oct 2, 4:52 PM", image: "images/insulin-syringes.png" },
  { sku: "SKU013", name: "Eye Drops 10ml", status: "Expiring Soon", detail: "Expires in 6 days", time: "Oct 2, 4:20 PM", image: "images/eye-drops.png" },
  { sku: "SKU014", name: "Amoxicillin 500mg", status: "Low Stock", detail: "4 left", time: "Oct 2, 3:58 PM", image: "images/amoxicillin-500.png" },
  { sku: "SKU015", name: "Antacid Tablets", status: "Expiring Soon", detail: "Expires in 2 days", time: "Oct 2, 3:31 PM", image: "images/antacid-tablets.png" },
];

let activeAlertFilter = "all";
const alertReadKey = "stockwise-alerts-read";
let readAlertSkus = new Set();
try {
  readAlertSkus = new Set(JSON.parse(localStorage.getItem(alertReadKey) || "[]"));
} catch (error) {
  // The alerts still work when browser storage is unavailable.
}

function saveReadAlerts() {
  try { localStorage.setItem(alertReadKey, JSON.stringify([...readAlertSkus])); } catch (error) {}
}

function countAlerts(status) {
  return alertRecords.filter((alert) => status === "all" || alert.status === status).length;
}

function renderAlerts() {
  const list = document.getElementById("alert-list");
  if (!list) return;

  document.querySelectorAll("[data-alert-count]").forEach((counter) => {
    counter.textContent = countAlerts(counter.dataset.alertCount);
  });

  document.querySelectorAll(".alert-filter").forEach((button) => {
    const filter = button.dataset.filter;
    const label = filter === "all" ? "All" : filter === "Sync Issue" ? "Sync Issues" : filter;
    button.textContent = label + " (" + countAlerts(filter) + ")";
  });

  const visible = alertRecords.filter((alert) => activeAlertFilter === "all" || alert.status === activeAlertFilter);
  if (!visible.length) {
    list.innerHTML = '<p class="py-10 text-center text-sm text-navy/70">No alerts in this category.</p>';
    return;
  }

  list.innerHTML = visible.map((alert) => {
    const read = readAlertSkus.has(alert.sku);
    const colors = alert.status === "Out of Stock"
      ? "bg-red-100 text-red-600"
      : alert.status === "Sync Issue"
        ? "bg-indigo-100 text-indigo-600"
        : "bg-orange-100 text-orange-700";
    const detail = alert.detail ? '<span>' + esc(alert.detail) + ' <span class="mx-1">•</span> </span>' : "";
    return '<article class="flex items-center justify-between gap-3 rounded-[10px] border border-navy/20 p-3 ' +
      (read ? "bg-white" : "bg-panel/60") + '">' +
      '<div class="flex min-w-0 items-center gap-3">' +
      '<img src="' + esc(alert.image) + '" alt="" loading="lazy" class="size-12 shrink-0 rounded-[5px] bg-navy/10 object-cover" onerror="this.style.display=\'none\'" />' +
      '<div class="min-w-0"><p class="text-sm font-bold">' + esc(alert.name) + '</p>' +
      '<p class="text-[11px] font-medium text-navy/70">SKU: ' + esc(alert.sku) + '</p>' +
      '<span class="mt-1 inline-block rounded-[3px] px-2 py-0.5 text-[10px] font-semibold ' + colors + '">' + esc(alert.status) + '</span>' +
      '<p class="mt-1 text-[11px] text-navy/80">' + detail + esc(alert.time) + '</p></div></div>' +
      (read ? '<span class="shrink-0 text-[11px] font-medium text-navy/50">Read</span>' :
        '<button type="button" data-read-alert="' + esc(alert.sku) + '" class="shrink-0 rounded-[5px] px-2 py-1 text-[11px] font-semibold text-navy hover:bg-navy/10">Mark read</button>') +
      '</article>';
  }).join("");
}

document.querySelectorAll(".alert-filter").forEach((button) => {
  button.addEventListener("click", () => {
    activeAlertFilter = button.dataset.filter || "all";
    document.querySelectorAll(".alert-filter").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("bg-navy", selected);
      item.classList.toggle("text-white", selected);
      item.classList.toggle("bg-navy/10", !selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    renderAlerts();
  });
});

document.getElementById("alert-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-read-alert]");
  if (!button) return;
  readAlertSkus.add(button.dataset.readAlert);
  saveReadAlerts();
  renderAlerts();
});

document.getElementById("alerts-mark-all").addEventListener("click", () => {
  alertRecords.forEach((alert) => readAlertSkus.add(alert.sku));
  saveReadAlerts();
  renderAlerts();
});

document.getElementById("alerts-menu-button").addEventListener("click", () => setSidebarOpen(true));
document.getElementById("reports-menu-button").addEventListener("click", () => setSidebarOpen(true));

// ---------- Start ----------

window.addEventListener("hashchange", route);

route();

})();
