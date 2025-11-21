const form = document.getElementById("bookingForm");
const qrSection = document.getElementById("qrSection");
const billModal = document.getElementById("billModal");
const billText = document.getElementById("billText");
const scanDoneBtn = document.getElementById("scanDoneBtn");
const closeModalBtn = document.getElementById("closeModalBtn");

const PRICE_PER_PERSON = 200;
let bookingInfo = "";

// เมื่อกดยืนยันการจอง
form.addEventListener("submit", function (e) {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const phone = document.getElementById("phone").value;
  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;
  const guests = Number(document.getElementById("guests").value);

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

  form.classList.add("hidden");
  qrSection.classList.remove("hidden");
});

// เมื่อกด "สแกนเสร็จแล้ว"
scanDoneBtn.addEventListener("click", () => {
  billText.textContent = bookingInfo;
  billModal.classList.remove("hidden");
});

// ปิด popup (ใช้งานได้แน่นอน)
closeModalBtn.addEventListener("click", () => {
  billModal.classList.add("hidden");
  qrSection.classList.add("hidden");
  form.reset();
  form.classList.remove("hidden");
});

// ปิด popup โดยคลิกที่พื้นหลัง
billModal.addEventListener("click", (e) => {
  if (e.target === billModal) {
    billModal.classList.add("hidden");
    qrSection.classList.add("hidden");
    form.reset();
    form.classList.remove("hidden");
  }
});