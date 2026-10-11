/* Deposit Defense Cleaning — /book funnel.
   Prices and settings come from window.DD (js/dd-config.js). */
(function () {
  "use strict";
  var DD = window.DD || {};
  var API = String(DD.api || "").replace(/\/+$/, "");
  var TZ = "America/Chicago";
  var STORE = "dd-book-v1";
  var ORDER = ["intro", "beds", "carpet", "facts", "contact", "price", "address", "time", "review"];
  var PREV = { beds: "intro", custom: "beds", carpet: "beds", facts: "carpet", contact: "facts", price: "contact", address: "price", time: "address", review: "time" };
  var BAR = { beds: 1, carpet: 2, facts: 3, contact: 4, price: 5, address: 6, time: 7, review: 8, custom: 1 };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return "$" + Math.round(n).toLocaleString("en-US"); };
  var digits = function (s) { return String(s || "").replace(/\D/g, ""); };

  /* ---------- state ---------- */
  var S = {
    step: "intro", beds: null, carpet: 0, enzyme: 0, utilities: "", empty: "", extras: [],
    first: "", last: "", phone: "", email: "", leadSent: "",
    addr: "", city: "", zip: "", notes: "", date: "", slot: ""
  };
  try {
    var saved = JSON.parse(sessionStorage.getItem(STORE) || "null");
    if (saved && typeof saved === "object") Object.keys(S).forEach(function (k) { if (k in saved) S[k] = saved[k]; });
  } catch (e) {}
  function save() { try { sessionStorage.setItem(STORE, JSON.stringify(S)); } catch (e) {} }

  /* ---------- pricing ---------- */
  function basePrice() { return (DD.bedroomPrices || {})[S.beds] || 0; }
  function total() {
    return basePrice() + S.carpet * (DD.carpetPerRoom || 0) + S.enzyme * (DD.petEnzymePerRoom || 0);
  }
  function bedLabel(n) { return n + (n === 1 ? " bedroom" : " bedrooms"); }
  function extrasLabels() {
    return (DD.quotedExtras || []).filter(function (x) { return S.extras.indexOf(x.key) > -1; }).map(function (x) { return x.label; });
  }
  function quoteLines() {
    var lines = [["Move-out clean, " + bedLabel(S.beds), money(basePrice())]];
    if (S.carpet) lines.push(["Carpet cleaning, " + S.carpet + (S.carpet === 1 ? " room" : " rooms"), money(S.carpet * DD.carpetPerRoom)]);
    if (S.enzyme) lines.push(["Pet enzyme treatment, " + S.enzyme + (S.enzyme === 1 ? " room" : " rooms"), money(S.enzyme * DD.petEnzymePerRoom)]);
    lines.push(["Photo documentation and invoice", "Included"]);
    return lines;
  }
  function quoteText() {
    var t = quoteLines().map(function (l) { return l[0] + ": " + l[1]; });
    t.push("Total: " + money(total()) + " " + (DD.taxNote || ""));
    var ex = extrasLabels();
    if (ex.length) t.push("Extras to price on arrival: " + ex.join(", "));
    return t.join("\n");
  }

  /* ---------- reachability ---------- */
  var validBeds = function () { return [1, 2, 3, 4, 5].indexOf(S.beds) > -1; };
  var factsDone = function () { return validBeds() && !!S.utilities && !!S.empty; };
  var contactDone = function () { return factsDone() && S.first && S.last && digits(S.phone).length === 10 && validEmail(S.email); };
  var addressDone = function () { return contactDone() && !!API && S.addr && S.city && /^\d{5}$/.test(S.zip); };
  function canShow(step) {
    switch (step) {
      case "intro": case "beds": return true;
      case "custom": return S.beds === "6+";
      case "carpet": case "facts": return validBeds();
      case "contact": return factsDone();
      case "price": return contactDone();
      case "address": return contactDone() && !!API;
      case "time": return addressDone();
      case "review": return addressDone() && !!S.slot;
    }
    return false;
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || "").trim()); }

  /* ---------- navigation ---------- */
  function show(step, push) {
    while (step && !canShow(step)) step = PREV[step];
    step = step || "intro";
    S.step = step; save();
    $$("[data-step]").forEach(function (el) { el.hidden = el.getAttribute("data-step") !== step; });
    var bar = $("#progress");
    bar.hidden = step === "intro";
    $("#progress span").style.width = Math.round(((BAR[step] || 0) / 8) * 100) + "%";
    if (push) depth++;
    if (push) history.pushState({ dd: step }, "", location.pathname + location.search);
    else history.replaceState({ dd: step }, "", location.pathname + location.search);
    render(step);
    window.scrollTo(0, 0);
    var panel = $('[data-step="' + step + '"]');
    var h = panel && panel.querySelector("h1, h2");
    if (h && push) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }
  function next(from) {
    var map = { intro: "beds", carpet: "facts", facts: "contact", price: "address", time: "review" };
    if (map[from]) show(map[from], true);
  }
  window.addEventListener("popstate", function (e) {
    depth = Math.max(0, depth - 1);
    var step = e.state && e.state.dd;
    show(step || "intro", false);
  });
  // Back buttons use browser history when we got here in this visit; after a
  // reload or a deep link, they step back logically instead of leaving the page.
  var depth = 0;
  $$("[data-back]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (depth > 0) history.back();
      else show(PREV[S.step] || "intro", false);
    });
  });
  $$("[data-next]").forEach(function (b) {
    b.addEventListener("click", function () { next(b.closest("[data-step]").getAttribute("data-step")); });
  });
  $("#startBtn").addEventListener("click", function () { show("beds", true); });

  /* ---------- renderers ---------- */
  function render(step) {
    if (step === "carpet") renderCarpet();
    if (step === "facts") renderFacts();
    if (step === "contact") ["first", "last", "phone", "email"].forEach(function (k) { $("#" + k).value = S[k] || ""; });
    if (step === "price") renderPrice();
    if (step === "address") {
      $("#addr").value = S.addr; $("#city").value = S.city || "Lawton"; $("#zip").value = S.zip; $("#notes").value = S.notes;
    }
    if (step === "time") loadSlots();
    if (step === "review") renderReview();
    renderBeds();
  }

  function renderBeds() {
    var wrap = $("#bedChoices");
    if (!wrap.children.length) {
      [1, 2, 3, 4, 5, "6+"].forEach(function (n) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "choice"; b.setAttribute("data-beds", n);
        b.innerHTML = n + (n === 1 ? " Bed" : " Beds") + "<small>" + (DD.bedroomPrices[n] ? money(DD.bedroomPrices[n]) : "Custom quote") + "</small>";
        b.addEventListener("click", function () {
          S.beds = n;
          if (n === "6+") { S.carpet = 0; S.enzyme = 0; save(); show("custom", true); return; }
          save(); show("carpet", true);
        });
        wrap.appendChild(b);
      });
    }
    $$("[data-beds]", wrap).forEach(function (b) {
      b.setAttribute("aria-pressed", String(String(S.beds) === b.getAttribute("data-beds")));
    });
  }

  var MAX_CARPET = 12;
  function renderCarpet() {
    $("#carpetOut").textContent = S.carpet;
    $("#enzymeOut").textContent = S.enzyme;
    $("#carpetMinus").disabled = S.carpet <= 0;
    $("#carpetPlus").disabled = S.carpet >= MAX_CARPET;
    $("#enzymeMinus").disabled = S.enzyme <= 0;
    $("#enzymePlus").disabled = S.enzyme >= S.carpet;
    $("#enzymeQ").hidden = S.carpet === 0;
    $("#runTotal1").textContent = money(total());
  }
  function bump(key, d) {
    S[key] = Math.max(0, S[key] + d);
    if (S.carpet > MAX_CARPET) S.carpet = MAX_CARPET;
    if (S.enzyme > S.carpet) S.enzyme = S.carpet;
    save(); renderCarpet();
  }
  $("#carpetMinus").addEventListener("click", function () { bump("carpet", -1); });
  $("#carpetPlus").addEventListener("click", function () { bump("carpet", 1); });
  $("#enzymeMinus").addEventListener("click", function () { bump("enzyme", -1); });
  $("#enzymePlus").addEventListener("click", function () { bump("enzyme", 1); });

  function renderFacts() {
    var list = $("#extrasList");
    if (!list.children.length) {
      (DD.quotedExtras || []).forEach(function (x) {
        var l = document.createElement("label");
        l.className = "check";
        l.innerHTML = '<input type="checkbox" value="' + x.key + '"><span><b>' + x.label + "</b><span>" + x.note + "</span></span>";
        l.querySelector("input").addEventListener("change", function (e) {
          S.extras = S.extras.filter(function (k) { return k !== x.key; });
          if (e.target.checked) S.extras.push(x.key);
          save();
        });
        list.appendChild(l);
      });
    }
    $$("input", list).forEach(function (i) { i.checked = S.extras.indexOf(i.value) > -1; });
    $$("[data-group]").forEach(function (g) {
      var key = g.getAttribute("data-group");
      $$(".choice", g).forEach(function (b) { b.setAttribute("aria-pressed", String(S[key] === b.getAttribute("data-val"))); });
    });
    $("#utilNote").hidden = !S.utilities || S.utilities === "Yes";
    $("#emptyNote").hidden = !S.empty || S.empty === "Empty";
    $("#factsNext").disabled = !factsDone();
  }
  $$("[data-group] .choice").forEach(function (b) {
    b.addEventListener("click", function () {
      S[b.parentNode.getAttribute("data-group")] = b.getAttribute("data-val");
      save(); renderFacts();
    });
  });

  /* ---------- contact gate ---------- */
  function fmtPhone(v) {
    var d = digits(v);
    if (d[0] === "1") d = d.slice(1); // US area codes never start with 1
    d = d.slice(0, 10);
    if (d.length < 4) return d;
    if (d.length < 7) return "(" + d.slice(0, 3) + ") " + d.slice(3);
    return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
  }
  $("#phone").addEventListener("input", function (e) {
    var el = e.target, atEnd = el.selectionStart === el.value.length;
    el.value = fmtPhone(el.value);
    if (atEnd) el.setSelectionRange(el.value.length, el.value.length);
  });
  function mark(id, bad) { $("#" + id).closest(".field").classList.toggle("bad", bad); return bad; }
  ["first", "last", "phone", "email", "addr", "city", "zip"].forEach(function (id) {
    $("#" + id).addEventListener("input", function () { $("#" + id).closest(".field").classList.remove("bad"); });
  });
  $("#contactForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = $("#first").value.trim(), l = $("#last").value.trim(), p = digits($("#phone").value), m = $("#email").value.trim();
    if (p[0] === "1") p = p.slice(1);
    var bad = [mark("first", !f), mark("last", !l), mark("phone", p.length !== 10), mark("email", !validEmail(m))];
    var firstBad = ["first", "last", "phone", "email"][bad.indexOf(true)];
    if (firstBad) { $("#" + firstBad).focus(); return; }
    S.first = f; S.last = l; S.phone = fmtPhone(p); S.email = m.toLowerCase(); save();
    sendLead();
    show("price", true);
  });

  function sendLead() {
    var key = [S.phone, S.email, total(), S.carpet, S.enzyme, S.extras.join()].join("|");
    if (!API || S.leadSent === key) return;
    S.leadSent = key; save();
    try {
      fetch(API + "/lead", {
        method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_type: "website_partial", full_name: S.first + " " + S.last, phone: digits(S.phone), email: S.email,
          call_outcome: "Saw price online", csr_lead_source: "Website /book", service: "Move-Out Clean",
          quoted_price: money(total()), details: summaryText(), submitted_at: new Date().toISOString()
        })
      }).catch(function () {});
    } catch (e) {}
  }

  /* ---------- price ---------- */
  function renderPrice() {
    $("#quoteLines").innerHTML = quoteLines().map(function (l) {
      return '<div class="quote-line' + (l[1] === "Included" ? " incl" : "") + '"><span>' + l[0] + "</span><span>" + l[1] + "</span></div>";
    }).join("");
    $("#quoteTotal").textContent = money(total());
    $("#priceHead").textContent = S.first ? "Here's Your Price, " + S.first + "." : "Here's Your Price.";
    $("#extrasPromise").hidden = !S.extras.length;
    $("#bookActions").hidden = !API;
    $("#textActions").hidden = !!API;
    $("#textAlt").parentNode.hidden = !API;
  }

  /* ---------- SMS / phone links ---------- */
  function smsHref(kind) {
    var body = kind === "custom"
      ? "Hi! I'd like a move-out cleaning quote for a home with 6+ bedrooms. Address: "
      : "Hi! I'd like to book a move-out clean.\n" + quoteText() + (S.first ? "\nName: " + S.first + " " + S.last : "");
    return "sms:+1" + (DD.phoneDigits || "") + "?&body=" + encodeURIComponent(body);
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-sms]");
    if (a) a.setAttribute("href", smsHref(a.getAttribute("data-sms")));
  }, true);

  /* ---------- address ---------- */
  $("#zip").addEventListener("input", function (e) { e.target.value = digits(e.target.value).slice(0, 5); });
  $("#addressForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var a = $("#addr").value.trim(), c = $("#city").value.trim(), z = $("#zip").value.trim();
    var bad = [mark("addr", a.length < 4), mark("city", !c), mark("zip", !/^\d{5}$/.test(z))];
    var firstBad = ["addr", "city", "zip"][bad.indexOf(true)];
    if (firstBad) { $("#" + firstBad).focus(); return; }
    S.addr = a; S.city = c; S.zip = z; S.notes = $("#notes").value.trim(); save();
    show("time", true);
  });
  $("#notes").addEventListener("input", function (e) { S.notes = e.target.value; save(); });

  /* ---------- availability ---------- */
  var slotCache = null, slotCacheAt = 0, slotLoading = null, dateLimit = 12;
  function ymd(d) { return d.toISOString().slice(0, 10); }
  function chicagoToday() {
    var p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    return new Date(p + "T12:00:00Z");
  }
  function addDays(d, n) { var x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; }
  function fetchRange(start, end) {
    return fetch(API + "/slots?start=" + ymd(start) + "&end=" + ymd(end)).then(function (r) {
      return r.json().then(function (j) { if (!r.ok || !j || j.ok === false) throw new Error("slots"); return j.data || {}; });
    });
  }
  function getSlots(force) {
    if (!force && slotCache && Date.now() - slotCacheAt < 5 * 60 * 1000) return Promise.resolve(slotCache);
    if (slotLoading && !force) return slotLoading;
    var today = chicagoToday(), days = DD.bookingDays || 60, half = Math.ceil(days / 2);
    // HighLevel caps one request at about a month, so ask for two halves.
    slotLoading = Promise.all([
      fetchRange(today, addDays(today, half - 1)),
      fetchRange(addDays(today, half), addDays(today, days - 1))
    ]).then(function (parts) {
      var out = {}, soon = Date.now() + 60 * 60 * 1000;
      parts.forEach(function (data) {
        Object.keys(data).forEach(function (k) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !data[k] || !Array.isArray(data[k].slots)) return;
          var list = data[k].slots.filter(function (iso) { var t = Date.parse(iso); return t && t > soon; });
          if (list.length) out[k] = (out[k] || []).concat(list);
        });
      });
      Object.keys(out).forEach(function (k) {
        out[k] = out[k].filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return Date.parse(a) - Date.parse(b); });
      });
      slotCache = out; slotCacheAt = Date.now(); slotLoading = null;
      return out;
    }, function (err) { slotLoading = null; throw err; });
    return slotLoading;
  }
  var fmtDay = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" });
  var fmtNum = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", day: "numeric" });
  var fmtMon = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" });
  var fmtLong = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });
  var fmtTime = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
  function keyDate(k) { return new Date(k + "T12:00:00Z"); }

  function loadSlots(force) {
    var grid = $("#dateGrid");
    $("#slotError").hidden = true;
    if (!slotCache || force) grid.innerHTML = '<p class="loading" style="grid-column:1/-1">Loading open times…</p>';
    getSlots(force).then(function (slots) {
      if (S.step !== "time") return;
      var keys = Object.keys(slots).sort();
      if (S.date && !slots[S.date]) { S.date = ""; S.slot = ""; }
      if (S.slot && (!S.date || slots[S.date].indexOf(S.slot) < 0)) S.slot = "";
      save();
      if (!keys.length) {
        grid.innerHTML = "";
        slotErr("We don't have open times online right now. Text or call us and we'll find you a time.");
        renderTimes(slots); return;
      }
      // Show a dozen open days at a time so the times stay close to the dates.
      var picked = keys.indexOf(S.date);
      if (picked >= dateLimit) dateLimit = Math.ceil((picked + 1) / 12) * 12;
      var html = "", lastMon = "";
      keys.slice(0, dateLimit).forEach(function (k) {
        var d = keyDate(k), mon = fmtMon.format(d);
        if (mon !== lastMon) { html += '<p class="month-label">' + mon + "</p>"; lastMon = mon; }
        html += '<button type="button" class="date-btn" data-date="' + k + '" aria-pressed="' + (S.date === k) + '" aria-label="' + fmtLong.format(d) + '">' +
          fmtDay.format(d) + "<b>" + fmtNum.format(d) + "</b>" + slots[k].length + (slots[k].length === 1 ? " time" : " times") + "</button>";
      });
      if (keys.length > dateLimit) html += '<button type="button" class="more-dates" id="moreDates">Show More Dates</button>';
      grid.innerHTML = html;
      renderTimes(slots);
    }, function () {
      if (S.step !== "time") return;
      grid.innerHTML = "";
      slotErr("We couldn't load open times. Check your connection and try again, or text us to book.", true);
    });
  }
  function slotErr(msg, retry) {
    var el = $("#slotError");
    el.innerHTML = msg + (retry ? ' <button type="button" class="back" id="slotRetry" style="min-height:0;padding:0;color:inherit;text-decoration:underline">Try again</button>' : "") +
      '<br><a href="#" data-sms="quote">Text us your quote</a> · <a href="tel:+1' + DD.phoneDigits + '">Call ' + DD.phoneDisplay + "</a>";
    el.hidden = false;
    var r = $("#slotRetry");
    if (r) r.addEventListener("click", function () { loadSlots(true); });
  }
  function renderTimes(slots) {
    var wrap = $("#timeWrap"), grid = $("#timeGrid");
    $$(".date-btn").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-date") === S.date)); });
    if (!S.date || !slots[S.date]) { wrap.hidden = true; $("#timeNext").disabled = true; return; }
    $("#timeHead").textContent = fmtLong.format(keyDate(S.date));
    grid.innerHTML = slots[S.date].map(function (iso) {
      return '<button type="button" class="time-btn" data-slot="' + iso + '" aria-pressed="' + (S.slot === iso) + '">' + fmtTime.format(new Date(iso)) + "</button>";
    }).join("");
    wrap.hidden = false;
    $("#timeNext").disabled = !S.slot;
  }
  $("#dateGrid").addEventListener("click", function (e) {
    if (e.target.closest("#moreDates")) { dateLimit += 12; loadSlots(); return; }
    var b = e.target.closest(".date-btn"); if (!b || !slotCache) return;
    if (S.date !== b.getAttribute("data-date")) { S.date = b.getAttribute("data-date"); S.slot = ""; save(); }
    renderTimes(slotCache);
    var w = $("#timeWrap"); if (w.scrollIntoView) w.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  $("#timeGrid").addEventListener("click", function (e) {
    var b = e.target.closest(".time-btn"); if (!b) return;
    S.slot = b.getAttribute("data-slot"); save();
    renderTimes(slotCache);
    $("#timeNext").focus({ preventScroll: true });
  });

  /* ---------- review + book ---------- */
  function whenText() {
    return S.slot ? fmtLong.format(keyDate(S.date)) + " at " + fmtTime.format(new Date(S.slot)) : "";
  }
  function addressText() { return S.addr + ", " + S.city + ", OK " + S.zip; }
  function summaryText() {
    var lines = [
      "Service: Move-Out Clean (Deposit Defense)",
      "Bedrooms: " + S.beds,
      "Carpet rooms: " + S.carpet + (S.enzyme ? " (pet enzyme on " + S.enzyme + ")" : ""),
      "Water and power on: " + S.utilities,
      "Home empty: " + S.empty,
      "Extras to price on arrival: " + (extrasLabels().join(", ") || "None"),
      "Estimate: " + money(total()) + " " + (DD.taxNote || ""),
      "Price check: crew walks through on arrival and confirms the price before starting."
    ];
    if (S.notes) lines.push("Customer notes: " + S.notes);
    return lines.join("\n");
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function renderReview() {
    var rows = [
      ["When", whenText()],
      ["Where", addressText()],
      ["Home", bedLabel(S.beds)],
      ["Carpet", S.carpet ? S.carpet + (S.carpet === 1 ? " room" : " rooms") + (S.enzyme ? ", pet treatment on " + S.enzyme : "") : "None"]
    ];
    if (S.extras.length) rows.push(["Extras", extrasLabels().join(", ") + " (priced on arrival)"]);
    rows.push(["Name", S.first + " " + S.last], ["Phone", S.phone], ["Email", S.email], ["Total", money(total()) + " " + (DD.taxNote || "")]);
    $("#summaryList").innerHTML = rows.map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("");
    $("#bookError").hidden = true;
  }

  var booking = false;
  $("#bookBtn").addEventListener("click", function () {
    if (booking || !canShow("review")) return;
    var btn = $("#bookBtn"), errBox = $("#bookError");
    booking = true; btn.disabled = true; btn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Booking…';
    errBox.hidden = true;
    var payload = {
      firstName: S.first, lastName: S.last, email: S.email, phone: digits(S.phone),
      address1: S.addr, city: S.city, state: "OK", postalCode: S.zip,
      startTime: S.slot, service: "Move-Out Clean", estimate: total(), notes: summaryText(),
      companyWebsite: $("#companyWebsite").value,
      details: {
        tags: ["move-out"], service_key: "moveout", service_type: "Deposit Defense Move-Out Clean", service: "Move-Out Clean",
        bedrooms: String(S.beds), carpet_rooms: String(S.carpet), pet_odor: S.enzyme ? "Yes" : "No",
        addons: extrasLabels().join(", ") || "None", estimated_price: money(total()), job_details: summaryText(),
        special_instructions: S.notes || "None"
      }
    };
    var done = function () { booking = false; btn.disabled = false; btn.textContent = "Book My Clean"; };
    fetch(API + "/book", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, j: j }; }); })
      .then(function (res) {
        if (res.j && res.j.ok) {
          try {
            sessionStorage.setItem("dd-confirm", JSON.stringify({ first: S.first, when: whenText(), where: addressText(), total: money(total()), tax: DD.taxNote || "" }));
            sessionStorage.removeItem(STORE);
          } catch (e) {}
          location.href = "/booking-confirmation.html";
          return;
        }
        done();
        if (res.status === 409) {
          S.slot = ""; save(); slotCache = null;
          if (depth > 0) history.back(); else show("time", false);
          setTimeout(function () { slotErr("Sorry, that time was just taken. Please pick another."); }, 400);
          return;
        }
        var msg = (res.j && res.j.fields && res.j.fields.join(" ")) || (res.j && res.j.error) || "We couldn't finish the booking.";
        errBox.innerHTML = esc(msg) + '<br><a href="#" data-sms="quote">Text us to book</a> or call <a href="tel:+1' + DD.phoneDigits + '">' + DD.phoneDisplay + "</a>.";
        errBox.hidden = false;
      }, function () {
        done();
        errBox.innerHTML = 'We couldn\'t reach our booking system. Check your connection and try again, or <a href="#" data-sms="quote">text us to book</a>.';
        errBox.hidden = false;
      });
  });

  /* ---------- config-driven text ---------- */
  $$("[data-phone]").forEach(function (el) { el.textContent = DD.phoneDisplay; });
  $$("[data-tel]").forEach(function (el) { el.setAttribute("href", "tel:+1" + DD.phoneDigits); });
  $$("[data-tax]").forEach(function (el) { el.textContent = DD.taxNote || ""; });
  $$("[data-carpet]").forEach(function (el) { el.textContent = money(DD.carpetPerRoom); });
  $$("[data-enzyme]").forEach(function (el) { el.textContent = money(DD.petEnzymePerRoom); });
  $$("[data-area]").forEach(function (el) { el.textContent = DD.area; });
  $$("[data-from]").forEach(function (el) {
    var p = Object.keys(DD.bedroomPrices || {}).map(function (k) { return DD.bedroomPrices[k]; });
    el.textContent = money(Math.min.apply(null, p));
  });

  /* ---------- start ---------- */
  if (S.beds !== null && S.beds !== "6+") S.beds = Number(S.beds) || null;
  show(S.step, false);
})();
