# Phumshop02 — พร้อมใช้งาน ไม่ต้องตั้งค่า ID อะไรอีกแล้ว

## 🚀 วิธีติดตั้ง (3 นาที ไม่ต้องแก้โค้ดเลย)

1. **สร้าง Google Sheet ใหม่** (เปล่าๆ ได้เลย ไม่ต้องทำคอลัมน์)
2. ในตัวชีต → เมนู **Extensions → Apps Script** (ต้องเปิดผ่านทางนี้เท่านั้น)
3. ลบโค้ดเดิม → **วางไฟล์ `Code.gs` ทั้งไฟล์** → กด 💾
4. เลือกฟังก์ชัน **`setupSheet`** → กด **Run** ▶️ → Allow สิทธิ์
   → ระบบสร้างชีต 7 แท็บ + คอลัมน์ + บัญชี `admin/1234` ให้เอง
5. **Deploy → New deployment → Web app**
   - Execute as: **Me** / Who has access: **Anyone**
   - คัดลอก URL `/exec` ไปใช้
6. บอก URL ให้ผู้ช่วยใส่ใน `assets/js/app.js` (บรรทัดที่ 3) → เสร็จ!

> ⚠️ เปลี่ยนรหัสผ่าน `admin/1234` ในแท็บ `Users` ทันทีหลังติดตั้ง!

## 🔧 หลังตั้ง ID ทำงานยังไง?

- `SPREADSHEET_ID = ''` (เว้นว่าง) → ระบบใช้**ชีตที่สคริปต์ผูกอยู่**อัตโนมัติ ไม่ต้องก็อป ID มาใส่
- `FOLDER_ID` ใส่โฟลเดอร์ Drive ใหม่ไว้แล้ว (`1Gp3zOM9...`)
- อยากชี้ไปชีตอื่น ให้ใส่ ID จาก URL: `docs.google.com/spreadsheets/d/`**`IDตรงนี้`**`/edit`

## 📋 โครงสร้างชีต (ถ้าอยากสร้างเองแทนการรัน setupSheet)

| แท็บ | คอลัมน์เรียงจากซ้ายไปขวา (ห้ามสลับลำดับ) |
|---|---|
| `Database` | วันที่, หมายเหตุ, ชื่อเอกสาร, ประเภทการเพิ่ม, ผู้อัปโหลด, ลิงก์ไฟล์, หมวดหมู่/วิชา, ชื่อไฟล์เดิม, ประเภทเนื้อหา |
| `Users` | Username, Password, Role — ใส่แถวแรก: `admin`, รหัสของคุณ, `admin` |
| `Subjects` | ID, Username, SubjectName, ExamDate |
| `Tasks` | ID, Username, SubjectID, TaskDetail, IsDone |
| `Flashcards` | ID, Username, SubjectID, Question, Answer, ImageURL |
| `Settings` | Key, Value |
| `Logs` | เวลา, รายละเอียด |

## 🌐 ลิงก์เว็บ (GitHub Pages)

https://masterphum07-web.github.io/Phumshop02/

Repo: https://github.com/masterphum07-web/Phumshop02

## 📝 หมายเหตุ

- แก้ `Code.gs` ทีหลัง → ต้อง **Deploy → Manage deployments → ✏️ → Version: New** ทุกครั้ง
- error เรื่องสิทธิ์ → ลบการเข้าถึงที่ `myaccount.google.com/connections` แล้ว Run ใหม่
