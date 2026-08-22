# Phumshop V2 — โปรเจคเว็บใหม่ (แยกจากตัวเดิม)

สำเนาโค้ดจากโปรเจค DOC HUB เพื่อทำเว็บใหม่แบบคนละระบบข้อมูล
**ไม่ได้เชื่อมกับ GitHub เดิมและไม่กระทบข้อมูลเดิมแน่นอน**

## 📁 โครงสร้างไฟล์

| ไฟล์ | หน้าที่ |
|---|---|
| `index.html` | หน้าเว็บหลัก |
| `assets/js/app.js` | ตรรกะการทำงานหน้าเว็บ + จุดตั้งค่า API_URL |
| `assets/css/style.css` | สไตล์เสริม |
| `Code.gs` | Backend ฝั่ง Google Apps Script |

## ⚙️ ขั้นตอนตั้งค่าใหม่ (ทำครั้งเดียว)

### 1. สร้าง Google Sheet ใหม่
- สร้าง Google Sheet ใหม่ → ตั้งชื่อตามต้องการ
- คัดลอก **ID ของชีต** จาก URL:
  `https://docs.google.com/spreadsheets/d/`**`ชีตIDตรงนี้`**`/edit`
- สร้างชีตย่อย (tab) ชื่อ: `Database`, `Users`, `Settings`, `Subjects`, `Tasks`, `Flashcards`, `Logs`
- ใส่ข้อมูล Users อย่างน้อย 1 แถว: คอลัมน์ A = ชื่อผู้ใช้, B = รหัสผ่าน, C = admin

### 2. สร้างโฟลเดอร์ Google Drive ใหม่ ✅ (ทำแล้ว ใส่ ID ให้เรียบร้อย)
- โฟลเดอร์ใหม่: `1Gp3zOM9_zEvAae8uExF5jdC-l_ePzxd6`

### 3. แก้ไข `Code.gs` (บรรทัดบนสุด)
```js
const SPREADSHEET_ID = 'ใส่-ID-Google-Sheet-ใหม่-ตรงนี้';   // ⬅️ เหลือตัวนี้ที่ยังไม่ได้ใส่
const FOLDER_ID = "1Gp3zOM9_zEvAae8uExF5jdC-l_ePzxd6";      // ✅ ใส่แล้ว
```

### 4. Deploy Apps Script ตัวใหม่
- เปิด Google Sheet ใหม่ → Extensions → Apps Script
- วางโค้ด `Code.gs` ลงไป
- Deploy → New deployment → ประเภท **Web app**
  - Execute as: **Me**
  - Who has access: **Anyone**
- คัดลอก URL ที่ได้ (ลงท้าย `/exec`)

### 5. แก้ไข `assets/js/app.js` (บรรทัดที่ 3)
```js
const API_URL = 'ใส่-URL-Apps-Script-ใหม่-ตรงนี้';
```

เสร็จแล้ว! เปิด `index.html` หรืออัปโหลดขึ้น GitHub Pages ของ repo ใหม่ได้เลย

## 📝 หมายเหตุ
- ทุกครั้งที่แก้ `Code.gs` ต้อง **Deploy → Manage deployments → Edit → Version: New** เพื่อให้โค้ดใหม่มีผล
- ชื่อเว็บ/สี/ไอคอน เปลี่ยนได้ภายหลังผ่านหน้าแดชบอร์ดแอดมิน (แถบ "ปรับแต่งหน้าเว็บ")
