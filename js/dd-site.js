/* Deposit Defense Cleaning — fills prices and contact links from js/dd-config.js
   on the homepage, confirmation and 404 pages, so they never drift from /book. */
(function () {
  "use strict";
  var DD = window.DD; if (!DD) return;
  var money = function (n) { return "$" + Math.round(n).toLocaleString("en-US"); };
  var all = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  all("[data-price]").forEach(function (el) {
    var p = DD.bedroomPrices[el.getAttribute("data-price")]; if (p) el.textContent = money(p);
  });
  all("[data-carpet]").forEach(function (el) { el.textContent = money(DD.carpetPerRoom); });
  all("[data-enzyme]").forEach(function (el) { el.textContent = money(DD.petEnzymePerRoom); });
  all("[data-tax]").forEach(function (el) { el.textContent = DD.taxNote || ""; });
  all("[data-phone]").forEach(function (el) { el.textContent = DD.phoneDisplay; });
  all("[data-tel]").forEach(function (el) { el.setAttribute("href", "tel:+1" + DD.phoneDigits); });
  all("[data-sms]").forEach(function (el) { el.setAttribute("href", "sms:+1" + DD.phoneDigits); });
  var yr = document.getElementById("yr"); if (yr) yr.textContent = new Date().getFullYear();
})();
