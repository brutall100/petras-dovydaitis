// Gyvas fonas: fotoaparatų blykstės publikoje ir kylančios dulkės prožektoriaus šviesoje.
// Animuojami tik transform ir opacity (tai daro CSS), JS tik sukuria daleles atsitiktinai.
(function () {
  "use strict";

  var layer = document.getElementById("particles");
  if (!layer) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var isPhone = window.matchMedia("(max-width: 600px)").matches;

  function rand(min, max) { return min + Math.random() * (max - min); }

  function build() {
    layer.textContent = "";
    if (reduce.matches) return; // lieka tik statiškas švytėjimas

    var flashes = isPhone ? 9 : 18;  // telefone perpus mažiau
    var dust = isPhone ? 14 : 28;
    var frag = document.createDocumentFragment();

    // Blykstės: daugiausia viršutinėje dalyje, kur „publika“
    for (var i = 0; i < flashes; i++) {
      var f = document.createElement("span");
      var s = rand(2, 5);
      f.className = "flash";
      f.style.width = s + "px";
      f.style.height = s + "px";
      f.style.left = rand(0, 100) + "%";
      f.style.top = rand(2, 55) + "%";
      f.style.setProperty("--dur", rand(4, 11).toFixed(2) + "s");
      f.style.setProperty("--delay", (-rand(0, 11)).toFixed(2) + "s");
      frag.appendChild(f);
    }

    // Dulkės: lėtai kyla į viršų ir nukrypsta į šoną
    for (var j = 0; j < dust; j++) {
      var d = document.createElement("span");
      var size = rand(1.5, 4.5);
      d.className = "dust";
      d.style.width = size + "px";
      d.style.height = size + "px";
      d.style.left = rand(0, 100) + "%";
      d.style.setProperty("--dur", rand(16, 34).toFixed(2) + "s");
      d.style.setProperty("--delay", (-rand(0, 34)).toFixed(2) + "s");
      d.style.setProperty("--sway", rand(-60, 60).toFixed(0) + "px");
      d.style.setProperty("--alpha", rand(0.15, 0.55).toFixed(2));
      frag.appendChild(d);
    }
    layer.appendChild(frag);
  }

  build();
  if (reduce.addEventListener) reduce.addEventListener("change", build);

  // Lengvas paralaksas judinant pelę (tik kompiuteryje)
  if (!isPhone && window.matchMedia("(pointer: fine)").matches) {
    var canvas = document.querySelector(".arena__canvas");
    var ticking = false, x = 0, y = 0;
    window.addEventListener("pointermove", function (e) {
      if (reduce.matches) return;
      x = e.clientX / window.innerWidth - 0.5;
      y = e.clientY / window.innerHeight - 0.5;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        layer.style.transform = "translate(" + (x * -18) + "px," + (y * -12) + "px)";
        if (canvas) canvas.style.transform = "translate(" + (x * 8) + "px," + (y * 6) + "px)";
        ticking = false;
      });
    }, { passive: true });
  }
})();
