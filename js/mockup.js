// Placeholder for the future "Genera mockup del servizio" feature.
(function () {
  "use strict";
  const id = new URLSearchParams(window.location.search).get("id") || "";
  const el = document.getElementById("requestId");
  // Only show IDs in the expected format; textContent avoids any HTML injection.
  if (el && /^R-\d{1,6}$/.test(id)) el.textContent = id;
})();
