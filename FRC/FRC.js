// FRC.js — URL-encoded POST to Apps Script (aligned with MWC/RTC template)
// Replace WEB_APP_URL and SPREADSHEET_ID with your values, and serve the page over HTTP (Live Server).

const form = document.getElementById("bookingForm");
const qrSection = document.getElementById("qrSection");
const billModal = document.getElementById("billModal");
const billText = document.getElementById("billText");
const scanDoneBtn = document.getElementById("scanDoneBtn");
const closeModalBtn = document.getElementById("closeModalBtn");

let statusEl = document.getElementById("sheetStatus");
if (!statusEl) {
  statusEl = document.createElement("div");
  statusEl.id = "sheetStatus";
  statusEl.style.marginTop = "8px";
  statusEl.style.fontWeight = "600";
  if (form && form.parentNode) form.parentNode.insertBefore(statusEl, form.nextSibling);
}

const PRICE_PER_PERSON = 200;
let bookingInfo = "";

// CONFIG: set your Apps Script Web App URL and target spreadsheet ID
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxnHpWuUOzyi3gRIdVJxwWM3_EjMeGPe5ZPZQb3LIZcnzYLaw7X5G9GPIqw3M8ett5RBw/exec"; // e.g. https://script.google.com/macros/s/AKfy.../exec
const SPREADSHEET_ID = "1xiNEq3JNLR9IjqJHnCHngws-diUvx5o5OaWuJ9tVAqY";
const SHEET_NAME = "FRC"; // tab name
const SECRET_TOKEN = ""; // optional

function showStatus(message, ok = true) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.style.color = ok ? "green" : "crimson";
}

if (form) {
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = (document.getElementById("name") || {}).value?.trim() || "";
    const phone = (document.getElementById("phone") || {}).value?.trim() || "";
    const date = (document.getElementById("date") || {}).value || "";
    const time = (document.getElementById("time") || {}).value || "";
    const guests = Number((document.getElementById("guests") || {}).value) || 0;

    const total = guests * PRICE_PER_PERSON;
    const billNo = "BILL-" + Math.floor(Math.random() * 999999);
    const table = "Table-" + (Math.floor(Math.random() * 6) + 1);

    bookingInfo =
      `เลขที่บิล: ${billNo}\n` +
      `ชื่อผู้จอง: ${name}\n` +
      `เบอร์โทร: ${phone}\n` +
      `วันที่: ${date}\nเวลา: ${time}\n` +
      `จำนวนคน: ${guests} คน\n` +
      `เลขที่โต๊ะ: ${table} \n` +
      `ราคารวม: ${total.toLocaleString()} บาท`;

    if (form) form.classList.add("hidden");
    if (qrSection) qrSection.classList.remove("hidden");

    showStatus("Sending reservation to Google Sheets...", true);

    const payload = {
      spreadsheetId: SPREADSHEET_ID,
      sheetName: SHEET_NAME,
      date: date,
      time: time,
      guests: guests,
      name: name,
      contact: phone,
      billNo: billNo,
      table: table,
      total: total
    };
    if (SECRET_TOKEN) payload._token = SECRET_TOKEN;

    try {
      const body = new URLSearchParams();
      Object.keys(payload).forEach(k => body.append(k, payload[k]));

      const resp = await fetch(WEB_APP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        mode: "cors",
        body: body.toString()
      });

      const text = await resp.text();
      let json = null;
      try { json = JSON.parse(text); } catch (err) {}

      if (resp.ok && json && json.status === "success") {
        showStatus("Reservation saved to Google Sheet ✅ (" + (json.sheet||SHEET_NAME) + ")", true);
      } else if (resp.ok && json && json.status) {
        showStatus("Saved but server returned: " + json.status + " - " + (json.message||""), false);
      } else {
        showStatus("Failed to save to sheet. Server response: " + text, false);
        console.warn("Sheet save response:", resp.status, text);
      }
    } catch (err) {
      showStatus("Network error while saving to sheet: " + err.message, false);
      console.error("Network/fetch error while saving reservation:", err);
    }
  });
}

if (scanDoneBtn) {
  scanDoneBtn.addEventListener("click", () => {
    if (billText) billText.textContent = bookingInfo;
    if (billModal) billModal.classList.remove("hidden");
  });
}

if (closeModalBtn) {
  closeModalBtn.addEventListener("click", () => {
    if (billModal) billModal.classList.add("hidden");
    if (qrSection) qrSection.classList.add("hidden");
    if (form) form.reset();
    if (form) form.classList.remove("hidden");
    showStatus("", true);
  });
}

if (billModal) {
  billModal.addEventListener("click", (e) => {
    if (e.target === billModal) {
      billModal.classList.add("hidden");
      if (qrSection) qrSection.classList.add("hidden");
      if (form) form.reset();
      if (form) form.classList.remove("hidden");
      showStatus("", true);
    }
  });
}
