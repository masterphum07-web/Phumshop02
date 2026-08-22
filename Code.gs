// ============================================================
// ⚠️  FOLDER_ID ใส่ของใหม่ให้แล้ว ✅
// เหลือ SPREADSHEET_ID = ID ของ Google Sheet ใหม่ (ดูได้จาก URL ของชีต)
// ดูวิธีหา ID ได้ใน README.md
// ============================================================
const SPREADSHEET_ID = 'ใส่-ID-Google-Sheet-ใหม่-ตรงนี้';
const FOLDER_ID = "1Gp3zOM9_zEvAae8uExF5jdC-l_ePzxd6";
const SHEET_NAME = "Database"; 

function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    try {
      let result = handleRequest(e.parameter);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  return HtmlService.createHtmlOutput('API is running. This backend is for DOC HUB GitHub Pages.')
    .setTitle('DOC HUB API');
}

function doPost(e) {
  try {
    let requestData;
    if (e.postData.type === "application/json") {
      requestData = JSON.parse(e.postData.contents);
    } else {
      requestData = JSON.parse(e.postData.contents || "{}");
    }
    
    let result = handleRequest(requestData);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleRequest(data) {
  const action = data.action;
  
  if (action === 'getInitialData') {
    return getInitialData();
  } else if (action === 'verifyLogin') {
    return verifyLogin(data.username, data.password);
  } else if (action === 'addNewCategory') {
    return addNewCategory(data.subjectName, data.username);
  } else if (action === 'deleteCategory') {
    return deleteCategory(data.subjectName, data.username);
  } else if (action === 'uploadFileToDrive') {
    return uploadFileToDrive(data.base64Data, data.filename, data.mimeType, data.category, data.uploader, data.docTitle, data.docType);
  } else if (action === 'uploadDocumentByLink') {
    return uploadDocumentByLink(data.docTitle, data.url, data.category, data.uploader, data.docType);
  } else if (action === 'addChecklistTask') {
    return addChecklistTask(data.username, data.subject, data.detail);
  } else if (action === 'toggleChecklistTask') {
    return toggleChecklistTask(data.id, data.currentStatus);
  } else if (action === 'addFlashcardItem') {
    return addFlashcardItem(data.username, data.subject, data.question, data.answer, data.imageBase64, data.imageName, data.imageMime);
  } else if (action === 'deleteFlashcard') {
    return deleteFlashcard(data.id, data.username);
  } else if (action === 'getSystemLogs') {
    return getSystemLogs();
  } else if (action === 'updateSettings') {
    return updateSettings(data.settings, data.username);
  } else if (action === 'setupSheet') {
    return setupSheet();
  } else {
    return { success: false, error: 'Action not found' };
  }
}

// ------------------------------------------------------------------
// ฟังก์ชันการจัดการข้อมูล
// ------------------------------------------------------------------
function getInitialData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 1. ดึงข้อมูล Settings
    let settings = {
      bannerTitle: "DOC HUB", bannerSubtitle: "ระบบจัดเก็บเอกสารและสำรองข้อมูล",
      primaryColor: "#2563eb", accentColor: "#9333ea", backgroundColor: "#f8fafc",
      bannerButtonText: "เริ่มต้นใช้งาน", showBanner: "true", siteIcon: "fa-layer-group"
    };
    const settingsSheet = ss.getSheetByName("Settings");
    if(settingsSheet) {
      const data = settingsSheet.getDataRange().getDisplayValues();
      for(let i=1; i<data.length; i++) { 
         if(data[i][0]) settings[String(data[i][0])] = String(data[i][1]);
      }
    }

    // 2. ดึงข้อมูลเอกสาร
    const docSheet = ss.getSheetByName(SHEET_NAME);
    let documents = [];
    let categoriesSet = new Set();

    const subjectSheet = ss.getSheetByName("Subjects");
    if(subjectSheet) {
      const sData = subjectSheet.getDataRange().getDisplayValues();
      for(let i=1; i<sData.length; i++) {
        if(sData[i][2]) categoriesSet.add(String(sData[i][2]));
      }
    }

    if (docSheet) {
      const data = docSheet.getDataRange().getDisplayValues();
      for(let i=1; i<data.length; i++) {
         let row = data[i];
         if (!row[2]) continue; 
         
         let title = String(row[2]);
         let uploader = row[4] ? String(row[4]) : "Unknown";
         let fileUrl = row[5] ? String(row[5]) : "#";
         let category = row[6] ? String(row[6]) : "ทั่วไป";
         let originalFilename = row[7] ? String(row[7]) : "-";
         let docType = row[8] ? String(row[8]) : "ทั่วไป"; 
         
         categoriesSet.add(category);
         documents.push({ 
           id: "DOC_" + i,
           title: title, 
           uploader: uploader, 
           uploadDate: String(row[0]), 
           fileSize: 0, 
           category: category, 
           fileUrl: fileUrl,
           originalFilename: originalFilename,
           docType: docType
         });
      }
    }

    let categories = Array.from(categoriesSet).map(c => ({name: c}));
    if(categories.length === 0) categories = [{name: "ทั่วไป"}];

    // 3. ดึงข้อมูล Tasks
    let tasks = [];
    const taskSheet = ss.getSheetByName("Tasks");
    if(taskSheet) {
      const data = taskSheet.getDataRange().getDisplayValues();
      for(let i=1; i<data.length; i++) {
        if(data[i][0]) {
          tasks.push({ id: String(data[i][0]), username: String(data[i][1]), subject: String(data[i][2]), detail: String(data[i][3]), isDone: String(data[i][4]).toUpperCase() === 'TRUE' });
        }
      }
    }

    // 4. ดึงข้อมูล Flashcards
    let flashcards = [];
    const fcSheet = ss.getSheetByName("Flashcards");
    if(fcSheet) {
      const data = fcSheet.getDataRange().getDisplayValues();
      for(let i=1; i<data.length; i++) {
        if(data[i][0]) {
          flashcards.push({ id: String(data[i][0]), username: String(data[i][1]), subject: String(data[i][2]), question: String(data[i][3]), answer: String(data[i][4]), image: data[i][5] ? String(data[i][5]) : "-" });
        }
      }
    }

    return { success: true, settings: {
      header_title: settings.bannerTitle, cta_text: settings.bannerSubtitle,
      primary_color: settings.primaryColor, accent_color: settings.accentColor,
      background_color: settings.backgroundColor, banner_button_text: settings.bannerButtonText,
      show_banner: settings.showBanner, site_icon: settings.siteIcon
    }, categories: categories, documents: documents, tasks: tasks, flashcards: flashcards };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function verifyLogin(username, password) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const userSheet = ss.getSheetByName("Users");
    if(!userSheet) return { success: false, message: "ระบบยังไม่มีชีต Users" };
    const data = userSheet.getDataRange().getDisplayValues();
    for(let i=1; i<data.length; i++) {
       if(String(data[i][0]) === String(username) && String(data[i][1]) === String(password)) {
          logActivity(`ผู้ใช้ ${username} เข้าสู่ระบบสำเร็จ`);
          return { success: true, username: String(data[i][0]), role: String(data[i][2]) };
       }
    }
    return { success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function addNewCategory(subjectName, username) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName("Subjects");
    if(!sheet) { sheet = ss.insertSheet("Subjects"); sheet.appendRow(["ID", "Username", "SubjectName", "ExamDate"]); }
    sheet.appendRow(["SUB_" + Utilities.getUuid().substring(0,8), username || "admin", subjectName, ""]);
    logActivity(`${username || "ผู้ใช้"} เพิ่มวิชาใหม่: ${subjectName}`);
    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
  } catch(e) { return ContentService.createTextOutput(JSON.stringify({ success: false, message: e.toString() })).setMimeType(ContentService.MimeType.JSON); }
}

function deleteCategory(subjectName, username) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName("Subjects");
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Sheet Subjects not found" })).setMimeType(ContentService.MimeType.JSON);
    
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][2]) === subjectName) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex > -1) {
      sheet.deleteRow(rowIndex);
      logActivity(`${username || "ผู้ใช้"} ลบวิชา: ${subjectName}`);
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: "ไม่พบวิชาที่ต้องการลบ (อาจถูกลบไปแล้วหรือมาจากเอกสาร)" })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch(e) { return ContentService.createTextOutput(JSON.stringify({ success: false, message: e.toString() })).setMimeType(ContentService.MimeType.JSON); }
}

function uploadFileToDrive(base64Data, filename, mimeType, category, uploader, docTitle, docType) {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID); 
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, filename);
    const file = folder.createFile(blob);
    // บาง Google Workspace ปิดการแชร์สาธารณะไว้ จึงไม่ให้ขั้นตอนนี้ทำให้ข้อมูลไม่ถูกบันทึกลงชีต
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (shareError) { Logger.log(shareError); }
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let docSheet = ss.getSheetByName(SHEET_NAME);
    if(!docSheet) throw new Error(`ไม่พบชีต ${SHEET_NAME}`);
    docSheet.appendRow([new Date(), "-", docTitle || filename, "อัปโหลดไฟล์", uploader, file.getUrl(), category, filename, docType || "ทั่วไป"]);
    logActivity(`อัปโหลดไฟล์: ${docTitle || filename} โดย ${uploader}`);
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function uploadDocumentByLink(docTitle, url, category, uploader, docType) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let docSheet = ss.getSheetByName(SHEET_NAME);
    if(docSheet) docSheet.appendRow([new Date(), "-", docTitle, "เพิ่มจากลิงก์", uploader, url, category, "External Link", docType || "ทั่วไป"]);
    logActivity(`เพิ่มเอกสารใหม่จากลิงก์: ${docTitle} โดย ${uploader}`);
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function addChecklistTask(username, subject, detail) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName("Tasks");
    if(!sheet) { sheet = ss.insertSheet("Tasks"); sheet.appendRow(["ID", "Username", "SubjectID", "TaskDetail", "IsDone"]); }
    sheet.appendRow([Utilities.getUuid().substring(0,8), username, subject, detail, "FALSE"]);
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function toggleChecklistTask(id, currentStatus) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName("Tasks");
    if(!sheet) return { success: false };
    const data = sheet.getDataRange().getValues();
    const newStatus = currentStatus ? "FALSE" : "TRUE";
    for(let i=1; i<data.length; i++) {
      if(String(data[i][0]) === String(id)) {
        sheet.getRange(i+1, 5).setValue(newStatus);
        return { success: true };
      }
    }
    return { success: false, message: "ไม่พบข้อมูล" };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function addFlashcardItem(username, subject, question, answer, imageBase64, imageName, imageMime) {
  try {
    let imageUrl = "-";
    if(imageBase64) {
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(imageBase64), imageMime, "FC_" + imageName));
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      imageUrl = file.getUrl();
    }
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName("Flashcards");
    if(!sheet) { sheet = ss.insertSheet("Flashcards"); sheet.appendRow(["ID", "Username", "SubjectID", "Question", "Answer", "ImageURL"]); }
    sheet.appendRow(["FLS_" + Utilities.getUuid().substring(0,8), username, subject, question, answer, imageUrl]);
    logActivity(`${username} สร้างแฟลชการ์ดหมวด ${subject}`);
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function deleteFlashcard(id, username) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName("Flashcards");
    if(!sheet) return { success: false, message: "Sheet not found" };
    
    const data = sheet.getDataRange().getValues();
    for(let i=1; i<data.length; i++) {
      if(String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        logActivity(`${username || "แอดมิน"} ลบแฟลชการ์ด ID: ${id}`);
        return { success: true };
      }
    }
    return { success: false, message: "Flashcard not found" };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function updateSettings(settingsData, username) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName("Settings");
    if(!sheet) {
      sheet = ss.insertSheet("Settings");
      sheet.appendRow(["Key", "Value"]);
    }
    
    // เคลียร์ข้อมูลเก่า
    sheet.clearContents();
    sheet.appendRow(["Key", "Value"]);
    
    // ใส่ข้อมูลใหม่
    for (let key in settingsData) {
      sheet.appendRow([key, settingsData[key]]);
    }
    
    logActivity(`${username || "แอดมิน"} อัปเดตการตั้งค่าเว็บไซต์`);
    return { success: true };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function getSystemLogs() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Logs");
    if(!sheet) return [];
    const data = sheet.getDataRange().getDisplayValues();
    let logs = [];
    for(let i=data.length-1; i>0; i--) { logs.push({ timestamp: data[i][0], details: data[i][1] }); }
    return logs;
  } catch(e) { return []; }
}

function logActivity(detail) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let logSheet = ss.getSheetByName("Logs");
    if(!logSheet) { logSheet = ss.insertSheet("Logs"); logSheet.appendRow(["เวลา", "รายละเอียด"]); }
    logSheet.appendRow([Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss"), detail]);
  } catch(e) {}
}

// ------------------------------------------------------------------
// 🚀 ตัวช่วยติดตั้งระบบอัตโนมัติ — รันครั้งเดียว สร้างทุกอย่างให้ครบ
// วิธีใช้: เปิด Google Sheet ใหม่ → Extensions → Apps Script →
//          วางโค้ดนี้ทั้งไฟล์ → เลือกฟังก์ชัน setupSheet → กด Run
// ------------------------------------------------------------------
function setupSheet() {
  let ss = null;
  try {
    if (SPREADSHEET_ID && SPREADSHEET_ID.indexOf('ใส่-') === -1) {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    }
  } catch(e) { /* ยังไม่ได้ใส่ ID จริง ใช้ตัวที่ script ผูกอยู่แทน */ }
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { success: false, message: 'หาสเปรดชีตไม่ได้ — กรุณารันจาก Apps Script ที่เปิดจากชีตโดยตรง หรือใส่ SPREADSHEET_ID ก่อน' };

  const HEADER_BG = "#eef2ff";

  // 1) Database — คลังเอกสาร (9 คอลัมน์ ห้ามสลับลำดับ)
  let db = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (db.getLastRow() === 0) {
    db.appendRow(["วันที่", "หมายเหตุ", "ชื่อเอกสาร", "ประเภทการเพิ่ม", "ผู้อัปโหลด", "ลิงก์ไฟล์", "หมวดหมู่/วิชา", "ชื่อไฟล์เดิม", "ประเภทเนื้อหา"]);
    db.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground(HEADER_BG);
  }

  // 2) Users — บัญชีเข้าสู่ระบบ (⚠️ อย่าลืมเปลี่ยนรหัสผ่าน admin หลังติดตั้ง!)
  let users = ss.getSheetByName("Users") || ss.insertSheet("Users");
  if (users.getLastRow() === 0) {
    users.appendRow(["Username", "Password", "Role"]);
    users.appendRow(["admin", "1234", "admin"]);
    users.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground(HEADER_BG);
  }

  // 3) Subjects — หมวดหมู่วิชา
  let subj = ss.getSheetByName("Subjects") || ss.insertSheet("Subjects");
  if (subj.getLastRow() === 0) {
    subj.appendRow(["ID", "Username", "SubjectName", "ExamDate"]);
    subj.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground(HEADER_BG);
  }

  // 4) Tasks — สิ่งที่ต้องทำ
  let tasks = ss.getSheetByName("Tasks") || ss.insertSheet("Tasks");
  if (tasks.getLastRow() === 0) {
    tasks.appendRow(["ID", "Username", "SubjectID", "TaskDetail", "IsDone"]);
    tasks.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground(HEADER_BG);
  }

  // 5) Flashcards — แฟลชการ์ด
  let fc = ss.getSheetByName("Flashcards") || ss.insertSheet("Flashcards");
  if (fc.getLastRow() === 0) {
    fc.appendRow(["ID", "Username", "SubjectID", "Question", "Answer", "ImageURL"]);
    fc.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground(HEADER_BG);
  }

  // 6) Settings — ตั้งค่าหน้าเว็บ
  let sett = ss.getSheetByName("Settings") || ss.insertSheet("Settings");
  if (sett.getLastRow() === 0) {
    sett.appendRow(["Key", "Value"]);
    sett.appendRow(["bannerTitle", "PHUMSHOP 02"]);
    sett.appendRow(["bannerSubtitle", "ระบบคลังเอกสารฉบับใหม่"]);
    sett.appendRow(["primaryColor", "#2563eb"]);
    sett.appendRow(["accentColor", "#9333ea"]);
    sett.appendRow(["backgroundColor", "#f8fafc"]);
    sett.appendRow(["bannerButtonText", "เริ่มต้นใช้งาน"]);
    sett.appendRow(["showBanner", "true"]);
    sett.appendRow(["siteIcon", "fa-layer-group"]);
    sett.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground(HEADER_BG);
  }

  // 7) Logs — ประวัติการใช้งาน
  let logs = ss.getSheetByName("Logs") || ss.insertSheet("Logs");
  if (logs.getLastRow() === 0) {
    logs.appendRow(["เวลา", "รายละเอียด"]);
    logs.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground(HEADER_BG);
    logs.appendRow([Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss"), "ติดตั้งระบบครั้งแรกโดย setupSheet"]);
  }

  // ลบแท็บ Sheet1 เปล่าที่ Google สร้างมาให้ตอนแรก
  const sheet1 = ss.getSheetByName("Sheet1");
  if (sheet1 && sheet1.getLastRow() === 0) { try { ss.deleteSheet(sheet1); } catch(e) {} }

  return { success: true, message: 'ติดตั้งครบแล้ว! สร้างชีตทั้ง 7 แท็บ + บัญชี admin/1234 (โปรดเปลี่ยนรหัสทันที)' };
}
