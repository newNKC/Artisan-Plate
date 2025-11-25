function isDateTimeValid(dateStr, timeStr) {
  const now = new Date();
  const input = new Date(`${dateStr}T${timeStr}`);
  if (isNaN(input.getTime())) return false;
  return input >= now;
}

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

const PRICE_PER_PERSON = 1700;
let bookingInfo = "";
let pendingPayload = null;
let hasSent = false;

// CONFIG (match your working values)
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxnHpWuUOzyi3gRIdVJxwWM3_EjMeGPe5ZPZQb3LIZcnzYLaw7X5G9GPIqw3M8ett5RBw/exec";
const SPREADSHEET_ID = "1xiNEq3JNLR9IjqJHnCHngws-diUvx5o5OaWuJ9tVAqY";
const SHEET_NAME = "RTC";
const SECRET_TOKEN = "";

function showStatus(message, ok = true) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.style.color = ok ? "green" : "crimson";
}

if (form) {
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = (document.getElementById("name") || {}).value?.trim() || "";
    const phone = (document.getElementById("phone") || {}).value?.trim() || "";
    const date = (document.getElementById("date") || {}).value || "";
    const time = (document.getElementById("time") || {}).value || "";
    const guests = Number((document.getElementById("guests") || {}).value) || 0;

        // --- Date validation: prevent past reservations ---
        if (!isDateTimeValid(date, time)) {
            showStatus("ไม่สามารถจองย้อนหลังได้ กรุณาเลือกวันและเวลาในอนาคต", false);
            return;
        }

    // basic validation example (you can expand)
    if (!date || !time || !name) {
      showStatus("Please fill required fields", false);
      return;
    }

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

    // Show QR section (user must scan/confirm)
    if (form) form.classList.add("hidden");
    if (qrSection) qrSection.classList.remove("hidden");

    // Prepare payload but DO NOT send yet
    pendingPayload = {
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
    if (SECRET_TOKEN) pendingPayload._token = SECRET_TOKEN;

    showStatus("Reservation prepared — scan QR to finalize.", true);
  });
}

if (scanDoneBtn) {
  scanDoneBtn.addEventListener("click", async () => {
    if (!pendingPayload) {
      if (bookingInfo && billText) {
        billText.textContent = bookingInfo;
        if (billModal) billModal.classList.remove("hidden");
      } else {
        showStatus("No reservation to finalize.", false);
      }
      return;
    }

    if (hasSent) {
      if (bookingInfo && billText) {
        billText.textContent = bookingInfo;
        if (billModal) billModal.classList.remove("hidden");
      }
      return;
    }

    showStatus("Sending reservation to Google Sheets...", true);

    try {
      const body = new URLSearchParams();
      Object.keys(pendingPayload).forEach(k => body.append(k, pendingPayload[k]));

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
        hasSent = true;
        if (billText) billText.textContent = bookingInfo;
        if (billModal) billModal.classList.remove("hidden");
      } else if (resp.ok && json && json.status) {
        showStatus("Saved but server returned: " + json.status + " - " + (json.message||""), false);
        if (billText) billText.textContent = "Saved but server returned: " + (json.message||"");
        if (billModal) billModal.classList.remove("hidden");
      } else {
        showStatus("Failed to save to sheet. Server response: " + text, false);
        if (billText) billText.textContent = "Failed to save to sheet. Server response: " + text;
        if (billModal) billModal.classList.remove("hidden");
        console.warn("Sheet save response:", resp.status, text);
      }
    } catch (err) {
      showStatus("Network error while saving to sheet: " + err.message, false);
      if (billText) billText.textContent = "Network error while saving to sheet: " + err.message;
      if (billModal) billModal.classList.remove("hidden");
      console.error("Network/fetch error while saving reservation:", err);
    } finally {
      pendingPayload = null;
    }
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
