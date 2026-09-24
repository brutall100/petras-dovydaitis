// Vykdomas <head> dalyje prieš piešiant puslapį, kad tema nesumirgėtų.
(function () {
  // Ženklas CSS'ui: JS veikia, todėl galima slėpti elementus iki jų atsiradimo
  document.documentElement.classList.add("js");
  var saved = null;
  try { saved = localStorage.getItem("pd-theme"); } catch (e) { /* privatus langas */ }
  if (saved === "light" || saved === "dark") {
    document.documentElement.setAttribute("data-theme", saved);
  }
})();
