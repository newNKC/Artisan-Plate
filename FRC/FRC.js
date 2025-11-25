// FRC.js - Final flow: validate -> show QR -> after QR scanned send -> on success show booking info & set status

// --- 1. CONSTANTS AND STATE ---
const AVAILABLE_TABLES = 10;
const MAX_GUESTS_PER_TABLE = 4;
let currentBookings = 0;

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxnHpWuUOzyi3gRIdVJxwWM3_EjMeGPe5ZPZQb3LIZcnzYLaw7X5G9GPIqw3M8ett2RBw/exec"; 
const SPREADSHEET_ID = "1xiNEq3JNLR9IjqJHnCHngws-diUvx5o5OaWuJ9tVAqY";
const SHEET_NAME = "FRC"; 
const SECRET_TOKEN = ""; 
const PRICE_PER_PERSON = 200;

// --- 2. DOM ELEMENTS ---
const form = document.getElementById("bookingForm");
const qrSection = document.getElementById("qrSection");
const billModal = document.getElementById("billModal");
const billText = document.getElementById("billText");
const scanDoneBtn = document.getElementById("scanDoneBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const tablesRemainingDisplay = document.getElementById('tablesRemainingDisplay'); 
const bookingStatusEl = document.getElementById('bookingStatus'); // optional element to show status

let statusEl = document.getElementById("sheetStatus");
if (!statusEl) {
  statusEl = document.createElement("div");
  statusEl.id = "sheetStatus";
  statusEl.style.marginTop = "8px";
  statusEl.style.fontWeight = "600";
  if (form && form.parentNode) form.parentNode.insertBefore(statusEl, form.nextSibling);
}

let bookingInfo = ""; // Global variable for bill details
let pendingPayload = null; // store payload to send after QR scanned
let hasSentPending = false;

// --- 3. UTILITY FUNCTIONS ---
function showStatus(message, ok = true) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.style.color = ok ? "green" : "crimson";
}

function updateBookingStatusUI(text, ok = true) {
  if (!bookingStatusEl) return;
  bookingStatusEl.textContent = text;
  bookingStatusEl.style.color = ok ? "green" : "crimson";
}

function updateTablesDisplay() {
    const remaining = AVAILABLE_TABLES - currentBookings;
    if (tablesRemainingDisplay) {
        tablesRemainingDisplay.textContent = `${remaining} โต๊ะ`;
        tablesRemainingDisplay.style.color = remaining <= 2 ? 'crimson' : 'green';
    }
}

// checkDateTime: only prevents past bookings
function checkDateTime(inputDate, inputTime) {
    const now = new Date();
    const selectedDateTime = new Date(`${inputDate}T${inputTime}`); 

    if (selectedDateTime < now) {
        return { isValid: false, message: "ไม่สามารถจองย้อนหลังได้ กรุณาเลือกวันและเวลาในอนาคต" };
    }
    return { isValid: true, message: "วันที่และเวลาถูกต้อง" };
}

function showBillModal(text, isSuccess) {
    if (!billModal || !billText || !billModal.querySelector('.modal-content')) return;

    billText.textContent = text;
    const modalContent = billModal.querySelector('.modal-content');

    modalContent.classList.remove('success', 'failure');

    if (isSuccess) {
        modalContent.classList.add('success'); 
    } else {
        modalContent.classList.add('failure');
    }

    // hide QR when showing final bill
    if (qrSection) qrSection.classList.add("hidden");
    billModal.classList.remove("hidden");
}

// --- 4. Function to send reservation to server (called after QR scanned) ---
async function sendPendingReservation() {
  if (!pendingPayload || hasSentPending) return;
  hasSentPending = true;
  showStatus("Finalizing reservation and saving to Google Sheets...", true);
  updateBookingStatusUI("Finalizing...");

  try {
    // add status field to payload so sheet can record it
    pendingPayload.status = "confirmed";

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
      updateBookingStatusUI("Confirmed", true);
      // show modal with success bookingInfo
      showBillModal(bookingInfo, true);
    } else {
      showStatus("Failed to save to sheet. Please try again.", false);
      updateBookingStatusUI("Save failed", false);
      showBillModal("Failed to save to sheet. Please try again.", false);
    }
  } catch (err) {
    showStatus("Network error while saving to sheet: " + err.message, false);
    updateBookingStatusUI("Network error", false);
    showBillModal("Network error while saving to sheet: " + err.message, false);
  } finally {
    // clear pending after attempt (keep bookingInfo for display)
    pendingPayload = null;
  }
}

// --- 5. MAIN SUBMIT HANDLER (prepare payload but DO NOT send) ---
if (form) {
    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const name = (document.getElementById("name") || {}).value?.trim() || "";
        const phone = (document.getElementById("phone") || {}).value?.trim() || "";
        const date = (document.getElementById("date") || {}).value || "";
        const time = (document.getElementById("time") || {}).value || "";
        const guests = Number((document.getElementById("guests") || {}).value) || 0;

        let message = '';

        // 1. VALIDATION
        const dateCheckResult = checkDateTime(date, time);
        if (!dateCheckResult.isValid) {
            message = `❌ **จองไม่ได้** ❌\n\nเหตุผล: ${dateCheckResult.message}`;
            showBillModal(message, false);
            return;
        }

        // 2. CAPACITY CHECK (client-side simulation)
        const tablesNeeded = Math.ceil(guests / MAX_GUESTS_PER_TABLE);
        const remainingTables = AVAILABLE_TABLES - currentBookings; 

        if (tablesNeeded > remainingTables) { 
            message = `❌ **จองไม่ได้** ❌\n\nขออภัยค่ะ/ครับ โต๊ะไม่พอสำหรับ ${guests} ท่าน\n(ต้องการ ${tablesNeeded} โต๊ะ แต่เหลือว่างเพียง ${remainingTables} โต๊ะ)`;
            showBillModal(message, false);
            return;
        }

        // reserve in UI simulation (not yet stored server-side)
        currentBookings += tablesNeeded; 
        updateTablesDisplay(); 
        const tablesLeft = AVAILABLE_TABLES - currentBookings;

        // prepare reservation details and pending payload (DO NOT send yet)
        const total = guests * PRICE_PER_PERSON;
        const billNo = "BILL-" + Math.floor(Math.random() * 999999);
        const table = "Table-" + (Math.floor(Math.random() * AVAILABLE_TABLES) + 1); 

        bookingInfo = 
            `✅ **จองโต๊ะสำเร็จ! (รอการยืนยัน)**\n\n` +
            `เลขที่บิล: ${billNo}\n` +
            `ชื่อผู้จอง: ${name}\n` +
            `เบอร์โทร: ${phone}\n` +
            `วันที่: ${date}\nเวลา: ${time}\n` +
            `จำนวนคน: ${guests} คน\n` +
            `เลขที่โต๊ะ: ${table} \n` +
            `ราคารวม: ${total.toLocaleString()} บาท\n\n` + 
            `***เหลือโต๊ะว่างในระบบ: ${tablesLeft} โต๊ะ***`;

        // hide form and show QR section for scanning
        if (form) form.classList.add("hidden");
        if (qrSection) qrSection.classList.remove("hidden"); 

        // Build pending payload to be sent later when QR scanned
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
            total: total,
            status: "pending" // initial state
        };
        if (SECRET_TOKEN) pendingPayload._token = SECRET_TOKEN;

        // Update UI status (only prepared, not sent)
        updateBookingStatusUI("Prepared — waiting QR scan", true);
        showStatus("Reservation prepared — scan QR to finalize.", true);
    });
}

// --- 6. QR SCAN (finalize) ---
if (scanDoneBtn) {
  scanDoneBtn.addEventListener("click", async () => {
    if (bookingInfo && pendingPayload) {
      // send now
      await sendPendingReservation();
    } else if (bookingInfo) {
      // booking exists but already sent or no pending payload
      showBillModal(bookingInfo, true);
    } else {
      showStatus("No reservation to finalize.", false);
    }
  });
}

// --- 7. MODAL / CLOSE HANDLERS ---
if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
        if (billModal) billModal.classList.add("hidden");
        if (qrSection) qrSection.classList.add("hidden");
        if (form) form.reset();
        if (form) form.classList.remove("hidden");
        showStatus("", true);
        updateBookingStatusUI("");
    });
}

if (billModal) {
    billModal.addEventListener("click", (e) => {
        if (e.target === billModal) {
            if (billModal) billModal.classList.add("hidden");
            if (qrSection) qrSection.classList.add("hidden");
            if (form) form.reset();
            if (form) form.classList.remove("hidden");
            showStatus("", true);
            updateBookingStatusUI("");
        }
    });
}

// initial update
updateTablesDisplay();
