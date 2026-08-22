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

## ⚙️ ขั้นตอนตั้งค่าใหม่ (ทำครั้งเดียว ง่ายมาก)

### 1. สร้าง Google Sheet เปล่าไว้ 1 ไฟล์
- สร้าง Google Sheet ใหม่ → ตั้งชื่อตามต้องการ (**ยังไม่ต้องทำคอลัมน์อะไรเลย!**)
- คัดลอก **ID ของชีต** จาก URL:
  `https://docs.google.com/spreadsheets/d/`**`ชีตIDตรงนี้`**`/edit`

### 2. โฟลเดอร์ Google Drive ✅ (ทำแล้ว ใส่ ID ให้เรียบร้อย)
- โฟลเดอร์ใหม่: `1Gp3zOM9_zEvAae8uExF5jdC-l_ePzxd6`

### 3. วางโค้ด + กดติดตั้งอัตโนมัติ
1. ใน Google Sheet ใหม่ → **Extensions → Apps Script**
2. ลบโค้ดเดิม → วางไฟล์ `Code.gs` ทั้งหมด
3. ในแถบด้านบนเลือกฟังก์ชัน **`setupSheet`** → กด **Run** ▶️
   - ครั้งแรก Google จะขอสิทธิ์ → กด Review permissions → เลือกบัญชี → Allow
   - ✅ ระบบสร้างชีตทั้ง 7 แท็บ + หัวคอลัมน์ + บัญชี `admin / 1234` ให้เอง
4. กลับมาที่โค้ด ใส่ **ID ของชีต** (จากขั้นตอนที่ 1) แทนที่ `ใส่-ID-Google-Sheet-ใหม่-ตรงนี้`
5. ⚠️ **เปลี่ยนรหัสผ่าน admin** ในแท็บ `Users` ของชีตทันที!

### 4. Deploy Apps Script ตัวใหม่
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
