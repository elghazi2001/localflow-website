/**
 * Proposal pages: makes the demo preview clickable.
 * No data is sent anywhere: choices only change classes on the page.
 */
(function () {
  "use strict";

  document.querySelectorAll(".opts").forEach(function (group) {
    group.querySelectorAll(".opt").forEach(function (button) {
      button.addEventListener("click", function () {
        group.querySelectorAll(".opt").forEach(function (other) { other.classList.remove("on"); });
        button.classList.add("on");
      });
    });
  });

  const go = document.getElementById("go");
  const ok = document.getElementById("ok");
  if (go && ok) {
    go.addEventListener("click", function () { ok.classList.add("show"); });
  }
})();
