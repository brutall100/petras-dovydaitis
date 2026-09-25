// Pagrindinė puslapio logika: tema, mygtukų bangelės, animacijos slenkant,
// skaičių „suskaičiavimas“ ir užsakymo forma (tikras serveris arba demo režimas).
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Šviesus / tamsus režimas ---------- */
  var toggle = document.getElementById("theme-toggle");
  var systemDark = window.matchMedia("(prefers-color-scheme: dark)");

  function currentTheme() {
    return root.getAttribute("data-theme") || (systemDark.matches ? "dark" : "light");
  }
  function updateToggleLabel() {
    var next = currentTheme() === "dark" ? "šviesų" : "tamsų";
    toggle.setAttribute("aria-label", "Įjungti " + next + " režimą");
    toggle.setAttribute("title", "Įjungti " + next + " režimą");
  }
  toggle.addEventListener("click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("pd-theme", next); } catch (e) { /* nieko baisaus */ }
    updateToggleLabel();
  });
  if (systemDark.addEventListener) systemDark.addEventListener("change", updateToggleLabel);
  updateToggleLabel();

  /* ---------- Bangelė (ripple) ant mygtukų ---------- */
  document.addEventListener("pointerdown", function (e) {
    var btn = e.target.closest(".btn");
    if (!btn || reduceMotion) return;
    var rect = btn.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height);
    var dot = document.createElement("span");
    dot.className = "ripple";
    dot.style.width = dot.style.height = size + "px";
    dot.style.left = (e.clientX - rect.left - size / 2) + "px";
    dot.style.top = (e.clientY - rect.top - size / 2) + "px";
    btn.appendChild(dot);
    dot.addEventListener("animationend", function () { dot.remove(); });
  });

  /* ---------- Atsiradimas slenkant + skaičių suskaičiavimas ---------- */
  function countUp(el) {
    var to = Number(el.getAttribute("data-to"));
    if (reduceMotion || !to) { el.textContent = to; return; }
    var start = null, duration = 1200;
    function step(t) {
      if (start === null) start = t;
      var p = Math.min((t - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        entry.target.querySelectorAll(".count").forEach(countUp);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) {
      el.querySelectorAll(".count").forEach(function (c) { c.textContent = "0"; });
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Užsakymo forma ---------- */
  var form = document.getElementById("booking-form");
  var statusBox = document.getElementById("form-status");
  var submitBtn = document.getElementById("submit-btn");
  var modeBox = document.getElementById("mode");
  var modeText = document.getElementById("mode-text");
  var details = document.getElementById("details");
  var detailsCount = document.getElementById("details-count");
  var deadline = document.getElementById("deadline");
  var DEMO_KEY = "pd-demo-orders";
  var mode = "demo";

  // Terminas negali būti praeityje
  var today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  deadline.min = today.toISOString().slice(0, 10);

  details.addEventListener("input", function () {
    detailsCount.textContent = details.value.length;
  });

  // Ar veikia tikras serveris? GitHub Pages svetainėje jo nėra, todėl įsijungia demo režimas.
  function setMode(next) {
    mode = next;
    modeBox.setAttribute("data-mode", next);
    modeText.textContent = next === "server"
      ? "Serveris prijungtas: užsakymai saugomi duomenų bazėje."
      : "Demo režimas: užsakymas išsaugomas tik tavo naršyklėje, niekur nesiunčiamas.";
  }
  (function detectServer() {
    // GitHub Pages ir atidarytas failas serverio neturi, todėl iš karto demo režimas
    if (!window.fetch || location.protocol === "file:" || /\.github\.io$/.test(location.hostname)) {
      setMode("demo");
      return;
    }
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 2500);
    fetch("api/health", { signal: ctrl ? ctrl.signal : undefined, headers: { Accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { setMode(data && data.ok ? "server" : "demo"); })
      .catch(function () { setMode("demo"); })
      .finally(function () { clearTimeout(timer); });
  })();

  var messages = {
    recipient: "Įrašyk, kam skirtas sveikinimas.",
    occasion: "Pasirink progą.",
    details: "Parašyk bent kelis žodžius, ką Jonas turėtų paminėti.",
    email: "Įrašyk teisingą el. pašto adresą, pvz., vardas@pastas.lt.",
    deadline: "Data negali būti praeityje.",
    consent: "Reikia sutikti su užsakymo sąlygomis."
  };

  function showError(input, text) {
    var field = input.closest(".field");
    var box = document.getElementById(input.id + "-error");
    field.classList.toggle("is-invalid", Boolean(text));
    input.setAttribute("aria-invalid", text ? "true" : "false");
    if (box) box.textContent = text || "";
  }

  function validate() {
    var firstBad = null;
    ["recipient", "occasion", "details", "email", "deadline", "consent"].forEach(function (id) {
      var input = document.getElementById(id);
      var ok = input.checkValidity();
      if (ok && id === "details" && input.value.trim().length < 5) ok = false;
      if (ok && input.type === "text" && !input.value.trim()) ok = false;
      showError(input, ok ? "" : messages[id]);
      if (!ok && !firstBad) firstBad = input;
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  // Klaida dingsta, kai lauką pataisai
  form.addEventListener("input", function (e) {
    if (e.target.closest(".field.is-invalid") && e.target.checkValidity()) showError(e.target, "");
  });
  form.addEventListener("change", function (e) {
    if (e.target.type === "checkbox" && e.target.checked) showError(e.target, "");
  });

  function collect() {
    var v = function (id) { return document.getElementById(id).value.trim(); };
    return {
      recipient: v("recipient"),
      occasion: v("occasion"),
      details: v("details"),
      tone: v("tone"),
      deadline: v("deadline") || null,
      email: v("email"),
      phone: v("phone") || null,
      consent: document.getElementById("consent").checked
    };
  }

  function saveDemo(order) {
    var list = [];
    try { list = JSON.parse(localStorage.getItem(DEMO_KEY)) || []; } catch (e) { list = []; }
    var id = "DEMO-" + String(list.length + 1).padStart(3, "0");
    list.push(Object.assign({ id: id, createdAt: new Date().toISOString() }, order));
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(list)); } catch (e) { /* privatus langas */ }
    return Promise.resolve({ id: id });
  }

  function sendToServer(order) {
    return fetch("api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(order)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) throw new Error(data.error || "Serveris atmetė užsakymą.");
        return data;
      });
    });
  }

  function showResult(html, isError) {
    statusBox.hidden = false;
    statusBox.classList.toggle("is-error", Boolean(isError));
    statusBox.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    statusBox.hidden = true;
    if (!validate()) return;

    var order = collect();
    submitBtn.disabled = true;
    submitBtn.querySelector(".btn__label").textContent = "Siunčiama…";

    var send = mode === "server" ? sendToServer(order) : saveDemo(order);
    send.then(function (data) {
      var note = mode === "server"
        ? "Susisieksime el. paštu <b>" + escapeHtml(order.email) + "</b> dėl apmokėjimo."
        : "Tai demo režimas: užsakymas išsaugotas tik tavo naršyklėje.";
      showResult("Ding ding! 🔔 Užsakymas <strong>" + escapeHtml(data.id) + "</strong> priimtas. Sveikinimas skirtas: " +
        escapeHtml(order.recipient) + ". " + note);
      form.classList.remove("is-sent");
      void form.offsetWidth; // leidžia animacijai pasikartoti
      form.classList.add("is-sent");
      form.reset();
      detailsCount.textContent = "0";
    }).catch(function (err) {
      showResult("Nepavyko išsiųsti: " + escapeHtml(err.message) + " Pabandyk dar kartą.", true);
    }).finally(function () {
      submitBtn.disabled = false;
      submitBtn.querySelector(".btn__label").textContent = "Siųsti užsakymą";
      statusBox.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
    });
  });
})();
