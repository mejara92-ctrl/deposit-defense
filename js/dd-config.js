/* Deposit Defense Cleaning — the ONE place prices, phone and booking settings live.
   Change a number here and every page (homepage, /book, confirmation) follows. */
window.DD = {
  brand: "Deposit Defense Cleaning",
  phoneDigits: "5802154212",
  phoneDisplay: "(580) 215-4212",
  area: "Lawton, Fort Sill and nearby",

  /* Booking API: the Deposit Defense Cloudflare Worker URL (no trailing slash).
     Until it's set (or if it can't be reached), /book still shows the price and
     offers "Text Us to Book" with the quote filled in, so no customer is lost. */
  api: "",

  /* Move-out cleaning, flat price by bedroom count (+ tax). 6+ bedrooms are quoted. */
  bedroomPrices: { 1: 199, 2: 299, 3: 399, 4: 499, 5: 599 },
  carpetPerRoom: 50,
  petEnzymePerRoom: 25,
  taxNote: "+ tax",

  /* Optional extras we quote on the walkthrough (not added to the online total). */
  quotedExtras: [
    { key: "trash", label: "Trash removal", note: "Bagged trash and small items" },
    { key: "walls", label: "Wall hole touch-up", note: "Small nail and screw holes" },
    { key: "odor", label: "Odor treatment", note: "Typical move-out odors" }
  ],

  /* Booking window shown on the calendar. */
  bookingDays: 60
};
