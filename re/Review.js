// state
let verified = false;
let reviews = JSON.parse(localStorage.getItem("reviews")) || [];

// ----------------------------------------------------------------------------------------------------------------------------------
// *** เปลี่ยนค่าในเครื่องหมายคำพูด (URL) ให้เป็น URL ของเว็บแอปที่คุณ Deploy ล่าสุด ***
const SHEET_URL = "https://script.google.com/macros/s/AKfycbxxwAo_aaKh81sV66UQYKtg9BMAz4oi35qu3VHPCLdPaSLoUDF0Es4fJYmxT86O0COm/exec"; // <<< เปลี่ยน URL ตรงนี้!
// ----------------------------------------------------------------------------------------------------------------------------------

// element
const receiptSection = document.getElementById("receiptSection");
const reviewSection  = document.getElementById("reviewSection");

const receiptInput   = document.getElementById("receiptInput");
const verifyBtn      = document.getElementById("verifyBtn");
const receiptStatus  = document.getElementById("receiptStatus");

const nameInput      = document.getElementById("name");
const ratingSelect   = document.getElementById("rating");
const reviewTextArea = document.getElementById("reviewText");
const submitReviewBtn= document.getElementById("submitReview");
const reviewList     = document.getElementById("reviewList");

// เพิ่ม element สำหรับแสดงสถานะการส่งข้อมูลไปยัง Google Sheet
const messageElement = document.getElementById('message'); // ตรวจสอบว่ามี <p id="message"></p> ใน HTML

// แสดงรีวิวเก่าที่มีใน localStorage เมื่อหน้าเว็บโหลด
loadReviews();

// ยืนยันเลขที่ใบเสร็จ
verifyBtn.addEventListener("click", () => {
  const receipt = receiptInput.value.trim();

  if (receipt.length >= 6) {
    verified = true;
    receiptStatus.textContent = "✅ ผ่านการยืนยันแล้ว กำลังไปหน้ากรอกรีวิว...";

    setTimeout(() => {
      receiptSection.classList.add("hidden");
      reviewSection.classList.remove("hidden");
    }, 600);
  } else {
    verified = false;
    receiptStatus.textContent = "❌ เลขที่ใบเสร็จไม่ถูกต้อง (ต้องอย่างน้อย 6 ตัวอักษร)";
  }
});

submitReviewBtn.addEventListener("click", async () => {
  if (!verified) {
    return alert("กรุณายืนยันใบเสร็จก่อน");
  }

  const receipt = receiptInput.value.trim();
  const name = nameInput.value.trim();
  const rating = ratingSelect.value;
  const reviewText = reviewTextArea.value.trim();

  if (!receipt) {
    return alert("ไม่มีเลขที่ใบเสร็จ");
  }
  if (!name || !reviewText) {
    return alert("กรุณากรอกชื่อและข้อความรีวิวให้ครบ");
  }

  // ใช้ form-urlencoded เพื่อลดปัญหา CORS preflight
  const formBody = new URLSearchParams({
    receipt: receipt,
    name: name,
    rating: rating,
    review: reviewText
  });

  if (messageElement) {
    messageElement.textContent = 'กำลังส่งข้อมูล...';
    messageElement.style.color = 'blue';
  }

  try {
    const response = await fetch(SHEET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: formBody.toString()
    });

    // Try to parse JSON response
    const result = await response.json();

    if (result.status === 'success') {
      if (messageElement) {
        messageElement.textContent = 'เพิ่มรีวิวสำเร็จ!';
        messageElement.style.color = 'green';
      }

      const review = {
        receipt: receipt,
        name: name,
        rating: rating,
        text: reviewText,
        time: new Date().toLocaleString("th-TH"),
      };

      reviews.unshift(review);
      localStorage.setItem("reviews", JSON.stringify(reviews));

      // reset form
      nameInput.value = "";
      ratingSelect.value = "5";
      reviewTextArea.value = "";

      loadReviews();

    } else if (result.status === 'duplicate') {
      if (messageElement) {
        messageElement.textContent = `ไม่สามารถเพิ่มรีวิว: หมายเลขใบเสร็จมีอยู่แล้ว`;
        messageElement.style.color = 'orange';
      }
      alert(`หมายเลขใบเสร็จนี้เคยถูกใช้งานแล้ว`);
    } else {
      if (messageElement) {
        messageElement.textContent = `เกิดข้อผิดพลาด: ${result.message || 'Unknown'}`;
        messageElement.style.color = 'red';
      }
      alert(`เกิดข้อผิดพลาดในการบันทึกรีวิว: ${result.message || 'Unknown'}`);
    }

  } catch (error) {
    console.error('Fetch error:', error);
    if (messageElement) {
      messageElement.textContent = `ข้อผิดพลาดในการเชื่อมต่อ: ${error.message}`;
      messageElement.style.color = 'red';
    }
    alert(`ข้อผิดพลาดในการเชื่อมต่อ: ${error.message}`);
  }
});

function loadReviews() {
  reviewList.innerHTML = "";

  if (reviews.length === 0) {
    reviewList.innerHTML = "<p style='font-size:13px; color:#9ca3af;'>ยังไม่มีรีวิว</p>";
    return;
  }

  reviews.forEach((r, index) => {
    const card = document.createElement("div");
    card.className = "review-card";

    card.innerHTML = `
      <strong>${r.name} (${r.rating}⭐)</strong><br>
      <p>${r.text}</p>
      <small>ใบเสร็จ: ${r.receipt ? r.receipt : '-'} • ${r.time}</small>
      <button class="delete-btn" onclick="deleteReview(${index})">ลบรีวิว</button>
    `;

    reviewList.appendChild(card);
  });
}

function deleteReview(i) {
  reviews.splice(i, 1);
  localStorage.setItem("reviews", JSON.stringify(reviews));
  loadReviews();
}

window.deleteReview = deleteReview;