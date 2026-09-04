// ============================================================
// ✅ พร้อมใช้งานทันที — ไม่ต้องแก้ไขอะไรในไฟล์นี้อีกแล้ว!
// วิธีใช้: สร้าง Google Sheet ใหม่ → เมนู Extensions → Apps Script
//          → วางโค้ดทั้งไฟล์นี้ → รัน setupSheet 1 ครั้ง → Deploy
// SPREADSHEET_ID เว้นว่าง = ใช้ชีตที่สคริปต์ผูกอยู่โดยอัตโนมัติ
// (ใส่เฉพาะเมื่ออยากให้ชี้ไปชีตคนละตัวกับที่สคริปต์ผูกอยู่)
// ============================================================
const SPREADSHEET_ID = '';
const FOLDER_ID = "1Gp3zOM9_zEvAae8uExF5jdC-l_ePzxd6";

// หาสเปรดชีตอัตโนมัติ: ไม่ใส่ ID ก็ใช้ชีตที่สคริปต์นี้ผูกอยู่
function getSS() {
  if (SPREADSHEET_ID) {
    try { return SpreadsheetApp.openById(SPREADSHEET_ID); } catch(e) {}
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}
const SHEET_NAME = "Database"; 

function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    try {
      let result = handleRequest(e.parameter);
      return formatGetResponse(result, e.parameter.callback);
    } catch (error) {
      return formatGetResponse({ success: false, error: error.toString() }, e.parameter.callback);
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
  } else if (action === 'registerUser') {
    return registerUser(data.username, data.password);
  } else if (action === 'addNewCategory') {
    return addNewCategory(data.subjectName, data.username);
  } else if (action === 'deleteCategory') {
    return deleteCategory(data.subjectName, data.username);
  } else if (action === 'uploadFileToDrive') {
    return uploadFileToDrive(data.base64Data, data.filename, data.mimeType, data.category, data.uploader, data.docTitle, data.docType, data.folderId);
  } else if (action === 'uploadDocumentByLink') {
    return uploadDocumentByLink(data.docTitle, data.url, data.category, data.uploader, data.docType, data.folderId);
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
  } else if (action === 'addFolder') {
    return addFolder(data.name, data.parentId, data.username);
  } else if (action === 'deleteFolder') {
    return deleteFolder(data.folderId, data.username);
  } else if (action === 'setFolderShare') {
    return setFolderShare(data.folderId, data.enabled, data.username);
  } else if (action === 'getFolderByToken') {
    return getFolderByToken(data.token, data.folderId);
  } else if (action === 'syncFromDrive') {
    return syncFromDrive(data.username);
  } else if (action === 'getDriveUsage') {
    return getDriveUsage();
  } else if (action === 'deleteDocument') {
    return deleteDocument(data.docId, data.username);
  } else if (action === 'renameDocument') {
    return renameDocument(data.docId, data.newTitle, data.username);
  } else if (action === 'moveDocument') {
    return moveDocument(data.docId, data.newFolderId, data.username);
  } else if (action === 'trackView') {
    return trackView(data.docId);
  } else if (action === 'reviewFlashcard') {
    return reviewFlashcard(data.id, data.remembered);
  } else if (action === 'setLineConfig') {
    return setLineConfig(data.token, data.target, data.username);
  } else if (action === 'testLineMessage') {
    return testLineMessage();
  } else if (action === 'toggleFavorite') {
    return toggleFavorite(data.username, data.fileUrl, data.docTitle);
  } else if (action === 'getMyFavorites') {
    return getMyFavorites(data.username);
  } else if (action === 'reportBrokenLink') {
    return reportBrokenLink(data.docId, data.username, data.note);
  } else if (action === 'changePassword') {
    return changePassword(data.username, data.oldPassword, data.newPassword);
  } else {
    return { success: false, error: 'Action not found' };
  }
}

// ------------------------------------------------------------------
// ฟังก์ชันการจัดการข้อมูล
// ------------------------------------------------------------------
function getInitialData() {
  try {
    const ss = getSS();
    
    // 1. ดึงข้อมูล Settings
    let settings = {
      bannerTitle: "DOC HUB", bannerSubtitle: "ระบบจัดเก็บเอกสารและสำรองข้อมูล",
      primaryColor: "#2563eb", accentColor: "#9333ea", backgroundColor: "#f8fafc",
      bannerButtonText: "เริ่มต้นใช้งาน", showBanner: "true", siteIcon: "fa-layer-group",
      siteFont: "Prompt", cornerStyle: "soft", animationsEnabled: "true", footerText: ""
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
    const hiddenCategorySet = new Set();
    const hiddenSheet = ss.getSheetByName("HiddenCategories");
    if(hiddenSheet) {
      hiddenSheet.getDataRange().getDisplayValues().slice(1).forEach(r => {
        if(r[0]) hiddenCategorySet.add(String(r[0]).trim().toLowerCase());
      });
    }

    const subjectSheet = ss.getSheetByName("Subjects");
    let subjects = [];
    if(subjectSheet) {
      const sData = subjectSheet.getDataRange().getDisplayValues();
      for(let i=1; i<sData.length; i++) {
        if(sData[i][2]) {
          const subjectName = String(sData[i][2]).trim();
          if(!hiddenCategorySet.has(subjectName.toLowerCase())) categoriesSet.add(subjectName);
          subjects.push({ id: String(sData[i][0] || ""), name: subjectName });
        }
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
         
         if(!hiddenCategorySet.has(category.toLowerCase())) categoriesSet.add(category);
         documents.push({
           id: "DOC_" + i,
           title: title,
           uploader: uploader,
           uploadDate: String(row[0]),
           fileSize: 0,
           category: category,
           fileUrl: fileUrl,
           originalFilename: originalFilename,
           docType: docType,
           folderId: row[9] ? String(row[9]) : "",
           views: row[10] ? (Number(String(row[10]).replace(/[^0-9]/g, '')) || 0) : 0
         });
      }
    }

    let categories = Array.from(categoriesSet).map(c => ({name: c}));
    if(categories.length === 0) categories = [{name: "ทั่วไป"}];
    // หน้าจัดการวิชาแสดงทุกหมวดหมู่ที่ผู้ใช้มองเห็น รวมถึงหมวดหมู่ที่มาจากเอกสาร
    const managedSubjects = categories.map(c => ({ id: "", name: c.name }));

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
          flashcards.push({ id: String(data[i][0]), username: String(data[i][1]), subject: String(data[i][2]), question: String(data[i][3]), answer: String(data[i][4]), image: data[i][5] ? String(data[i][5]) : "-", box: row6ToBox(data[i][6]) });
        }
      }
    }

    // 5. ดึงข้อมูลโฟลเดอร์
    let folders = [];
    const folderSheet = ss.getSheetByName("Folders");
    if(folderSheet) {
      const data = folderSheet.getDataRange().getDisplayValues();
      for(let i=1; i<data.length; i++) {
        if(data[i][0]) {
          folders.push({ id: String(data[i][0]), name: String(data[i][1]), parentId: data[i][2] ? String(data[i][2]) : "", shareToken: data[i][3] ? String(data[i][3]) : "", shareEnabled: data[i][4] ? String(data[i][4]).toUpperCase() === "TRUE" : false });
        }
      }
    }

    return { success: true, settings: {
      header_title: settings.bannerTitle, cta_text: settings.bannerSubtitle,
      primary_color: settings.primaryColor, accent_color: settings.accentColor,
      background_color: settings.backgroundColor, banner_button_text: settings.bannerButtonText,
      show_banner: settings.showBanner, site_icon: settings.siteIcon,
      site_font: settings.siteFont, corner_style: settings.cornerStyle,
      animations_enabled: settings.animationsEnabled, footer_text: settings.footerText,
      line_token: settings.lineToken || "", line_target: settings.lineTarget || ""
    }, categories: categories, subjects: managedSubjects, documents: documents, tasks: tasks, flashcards: flashcards, folders: folders, driveFolderUrl: "https://drive.google.com/drive/folders/" + FOLDER_ID };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function verifyLogin(username, password) {
  try {
    const ss = getSS();
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

// สมัครสมาชิกใหม่ (สิทธิ์ 'user' — ใช้ To-Do/แฟลชการ์ดส่วนตัวได้ ไม่เห็นแดชบอร์ด)
function registerUser(username, password) {
  try {
    username = String(username || '').trim();
    password = String(password || '');
    if(username.length < 3) return { success: false, message: "ชื่อผู้ใช้ต้องยาวอย่างน้อย 3 ตัวอักษร" };
    if(username.length > 30) return { success: false, message: "ชื่อผู้ใช้ยาวเกินไป (สูงสุด 30 ตัวอักษร)" };
    if(password.length < 4) return { success: false, message: "รหัสผ่านต้องยาวอย่างน้อย 4 ตัวอักษร" };
    const ss = getSS();
    let sheet = ss.getSheetByName("Users");
    if(!sheet) { sheet = ss.insertSheet("Users"); sheet.appendRow(["Username", "Password", "Role"]); }
    const data = sheet.getDataRange().getDisplayValues();
    for(let i=1; i<data.length; i++) {
      if(String(data[i][0]).toLowerCase() === username.toLowerCase()) {
        return { success: false, message: "มีชื่อผู้ใช้นี้ในระบบแล้ว ลองใช้ชื่ออื่น" };
      }
    }
    sheet.appendRow([username, password, "user"]);
    logActivity(`สมาชิกใหม่สมัครเข้าใช้งาน: ${username}`);
    return { success: true, username: username, role: "user" };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function addNewCategory(subjectName, username) {
  try {
    subjectName = String(subjectName || '').trim();
    if(!subjectName) return { success: false, message: "กรุณาระบุชื่อวิชา" };
    const ss = getSS();
    const hidden = ss.getSheetByName("HiddenCategories");
    if(hidden) {
      const hiddenRows = hidden.getDataRange().getDisplayValues();
      for(let i=1; i<hiddenRows.length; i++) {
        if(String(hiddenRows[i][0] || '').trim().toLowerCase() === subjectName.toLowerCase()) {
          hidden.deleteRow(i + 1);
          break;
        }
      }
    }
    let sheet = ss.getSheetByName("Subjects");
    if(!sheet) { sheet = ss.insertSheet("Subjects"); sheet.appendRow(["ID", "Username", "SubjectName", "ExamDate"]); }
    const existing = sheet.getDataRange().getDisplayValues();
    for(let i=1; i<existing.length; i++) {
      if(String(existing[i][2] || '').trim().toLowerCase() === subjectName.toLowerCase()) {
        return { success: false, message: "มีวิชานี้อยู่แล้ว" };
      }
    }
    sheet.appendRow(["SUB_" + Utilities.getUuid().substring(0,8), username || "admin", subjectName, ""]);
    logActivity(`${username || "ผู้ใช้"} เพิ่มวิชาใหม่: ${subjectName}`);
    return { success: true, message: "เพิ่มวิชาเรียบร้อย" };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function deleteCategory(subjectName, username) {
  try {
    subjectName = String(subjectName || '').trim();
    const ss = getSS();
    const sheet = ss.getSheetByName("Subjects");
    
    const data = sheet ? sheet.getDataRange().getValues() : [];
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][2] || '').trim().toLowerCase() === subjectName.toLowerCase()) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex > -1) {
      sheet.deleteRow(rowIndex);
    }
    // บันทึกชื่อที่ลบไว้เพื่อไม่ให้หมวดหมู่จากเอกสารถูกสร้างกลับมาในตัวเลือก
    let hidden = ss.getSheetByName("HiddenCategories");
    if(!hidden) {
      hidden = ss.insertSheet("HiddenCategories");
      hidden.appendRow(["CategoryName", "HiddenAt", "HiddenBy"]);
    }
    const hiddenRows = hidden.getDataRange().getDisplayValues();
    const alreadyHidden = hiddenRows.slice(1).some(r => String(r[0] || '').trim().toLowerCase() === subjectName.toLowerCase());
    if(!alreadyHidden) hidden.appendRow([subjectName, new Date(), username || "admin"]);
    logActivity(`${username || "ผู้ใช้"} ลบ/ซ่อนวิชา: ${subjectName}`);
    return { success: true, message: "ลบวิชาออกจากตัวเลือกเรียบร้อย" };
  } catch(e) { return { success: false, message: e.toString() }; }
}

// หา path เต็มของโฟลเดอร์ เช่น "ปี 1 / คณิตศาสตร์ / สรุป"
function getFolderPath(ss, folderId) {
  if(!folderId) return "";
  const sheet = ss.getSheetByName("Folders");
  if(!sheet) return "";
  const data = sheet.getDataRange().getDisplayValues();
  let path = [];
  let currentId = String(folderId);
  let guard = 0;
  while(currentId && guard < 20) {
    let found = null;
    for(let i=1; i<data.length; i++) {
      if(String(data[i][0]) === currentId) { found = data[i]; break; }
    }
    if(!found) break;
    path.unshift(String(found[1]));
    currentId = found[2] ? String(found[2]) : "";
    guard++;
  }
  return path.join(" / ");
}

// JSONP ช่วยให้ Safari/iPad อ่านข้อมูลได้ แม้ Apps Script จะ redirect โดเมนระหว่างทาง
function formatGetResponse(result, callback) {
  const json = JSON.stringify(result);
  const cb = String(callback || "").match(/^[A-Za-z_$][0-9A-Za-z_$]*$/);
  if(cb) return ContentService.createTextOutput(cb[0] + "(" + json + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

// หาโฟลเดอร์จริงใน Drive จากรหัสโฟลเดอร์ของระบบ
// ถ้ายังไม่มีโฟลเดอร์จริง จะสร้างตามลำดับชั้นให้โดยอัตโนมัติ
function getDriveFolderForSystemFolder(ss, folderId) {
  const root = DriveApp.getFolderById(FOLDER_ID);
  if(!folderId) return root;
  const sheet = ss.getSheetByName("Folders");
  if(!sheet) throw new Error("ไม่พบชีต Folders");
  const rows = sheet.getDataRange().getDisplayValues();
  const byId = {};
  rows.slice(1).forEach(r => { if(r[0]) byId[String(r[0])] = { name: String(r[1] || "").trim(), parentId: String(r[2] || "") }; });

  const chain = [];
  let currentId = String(folderId);
  let guard = 0;
  while(currentId && byId[currentId] && guard++ < 50) {
    chain.unshift(byId[currentId].name);
    currentId = byId[currentId].parentId;
  }
  if(currentId) throw new Error("ไม่พบโฟลเดอร์แม่ของโฟลเดอร์ปลายทาง");

  let current = root;
  chain.forEach(name => {
    if(!name) return;
    const matches = current.getFoldersByName(name);
    current = matches.hasNext() ? matches.next() : current.createFolder(name);
  });
  return current;
}

function uploadFileToDrive(base64Data, filename, mimeType, category, uploader, docTitle, docType, folderId) {
  try {
    const ss = getSS();
    const folder = getDriveFolderForSystemFolder(ss, folderId);
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, filename);
    const file = folder.createFile(blob);
    // บาง Google Workspace ปิดการแชร์สาธารณะไว้ จึงไม่ให้ขั้นตอนนี้ทำให้ข้อมูลไม่ถูกบันทึกลงชีต
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (shareError) { Logger.log(shareError); }
    let docSheet = ss.getSheetByName(SHEET_NAME);
    if(!docSheet) throw new Error(`ไม่พบชีต ${SHEET_NAME}`);
    const folderPath = folderId ? getFolderPath(ss, folderId) : "";
    // ถ้าเลือกวิชาไว้ให้ใช้วิชา แต่ถ้าไม่ระบุวิชาให้ใช้ชื่อเส้นทางโฟลเดอร์แทน
    const finalCategory = category || folderPath || "ทั่วไป";
    docSheet.appendRow([new Date(), "-", docTitle || filename, "อัปโหลดไฟล์", uploader, file.getUrl(), finalCategory, filename, docType || "ทั่วไป", folderId || "", 0]);
    logActivity(`อัปโหลดไฟล์: ${docTitle || filename} โดย ${uploader}`);
    const lineSent = sendLineMessage(`📄 มีเอกสารใหม่\n📝 ${docTitle || filename}\n👤 โดย ${uploader || "-"}\n🕒 ${formatLineDate(new Date())}${folderPath ? "\n📁 " + folderPath : ""}`);
    return { success: true, lineSent: lineSent };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function uploadDocumentByLink(docTitle, url, category, uploader, docType, folderId) {
  try {
    const ss = getSS();
    let docSheet = ss.getSheetByName(SHEET_NAME);
    const folderPath = folderId ? getFolderPath(ss, folderId) : "";
    // ถ้าเลือกวิชาไว้ให้ใช้วิชา แต่ถ้าไม่ระบุวิชาให้ใช้ชื่อเส้นทางโฟลเดอร์แทน
    const finalCategory = category || folderPath || "ทั่วไป";
    if(docSheet) docSheet.appendRow([new Date(), "-", docTitle, "เพิ่มจากลิงก์", uploader, url, finalCategory, "External Link", docType || "ทั่วไป", folderId || "", 0]);
    logActivity(`เพิ่มเอกสารใหม่จากลิงก์: ${docTitle} โดย ${uploader}`);
    const lineSent = sendLineMessage(`🔗 เพิ่มเอกสารใหม่ (ลิงก์)\n📝 ${docTitle}\n👤 โดย ${uploader || "-"}\n🕒 ${formatLineDate(new Date())}${folderPath ? "\n📁 " + folderPath : ""}`);
    return { success: true, lineSent: lineSent };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function addChecklistTask(username, subject, detail) {
  try {
    const ss = getSS();
    let sheet = ss.getSheetByName("Tasks");
    if(!sheet) { sheet = ss.insertSheet("Tasks"); sheet.appendRow(["ID", "Username", "SubjectID", "TaskDetail", "IsDone"]); }
    sheet.appendRow([Utilities.getUuid().substring(0,8), username, subject, detail, "FALSE"]);
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function toggleChecklistTask(id, currentStatus) {
  try {
    const ss = getSS();
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
    const ss = getSS();
    let sheet = ss.getSheetByName("Flashcards");
    if(!sheet) { sheet = ss.insertSheet("Flashcards"); sheet.appendRow(["ID", "Username", "SubjectID", "Question", "Answer", "ImageURL"]); }

    // บันทึกการ์ดก่อนเสมอ — รูปอัปโหลดทีหลัง ถ้ารูปพังการ์ดก็ยังอยู่ครบ
    const rowId = "FLS_" + Utilities.getUuid().substring(0,8);
    sheet.appendRow([rowId, username || "guest", subject || "", question, answer, "-"]);
    logActivity(`${username || "ผู้ใช้"} สร้างแฟลชการ์ดหมวด ${subject || "ทั่วไป"}`);

    if(imageBase64) {
      try {
        const folder = DriveApp.getFolderById(FOLDER_ID);
        const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(imageBase64), imageMime, "FC_" + imageName));
        // บางโดเมนปิดการแชร์สาธารณะ จึงกันไม่ให้ขั้นตอนนี้ทำลายผลลัพธ์
        try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(shareError) { Logger.log(shareError); }
        const data = sheet.getDataRange().getValues();
        for(let i=1; i<data.length; i++) {
          if(String(data[i][0]) === rowId) { sheet.getRange(i+1, 6).setValue(file.getUrl()); break; }
        }
      } catch(imgError) {
        Logger.log(imgError);
        // รูปไม่สำเร็จ = การ์ดยังใช้ได้ แค่ไม่มีภาพประกอบ
      }
    }

    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function deleteFlashcard(id, username) {
  try {
    const ss = getSS();
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
    const ss = getSS();
    let sheet = ss.getSheetByName("Settings");
    if(!sheet) {
      sheet = ss.insertSheet("Settings");
      sheet.appendRow(["Key", "Value"]);
    }

    // อ่านค่าเดิมมารวมก่อน เพื่อไม่ให้ค่าอื่น (เช่น ค่า LINE) หายไปตอนบันทึก
    const existing = {};
    const old = sheet.getDataRange().getDisplayValues();
    for(let i=1; i<old.length; i++) {
      if(old[i][0]) existing[String(old[i][0])] = old[i][1];
    }
    const merged = Object.assign(existing, settingsData);

    sheet.clearContents();
    sheet.getRange(1, 1, 1, 2).setValues([["Key", "Value"]]);
    const keys = Object.keys(merged);
    if(keys.length > 0) {
      sheet.getRange(2, 1, keys.length, 2).setValues(keys.map(k => [k, merged[k]]));
    }

    logActivity(`${username || "แอดมิน"} อัปเดตการตั้งค่าเว็บไซต์`);
    return { success: true };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function getSystemLogs() {
  try {
    const sheet = getSS().getSheetByName("Logs");
    if(!sheet) return [];
    const data = sheet.getDataRange().getDisplayValues();
    let logs = [];
    for(let i=data.length-1; i>0; i--) { logs.push({ timestamp: data[i][0], details: data[i][1] }); }
    return logs;
  } catch(e) { return []; }
}

function logActivity(detail) {
  try {
    const ss = getSS();
    let logSheet = ss.getSheetByName("Logs");
    if(!logSheet) { logSheet = ss.insertSheet("Logs"); logSheet.appendRow(["เวลา", "รายละเอียด"]); }
    logSheet.appendRow([Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss"), detail]);
  } catch(e) {}
}

// ------------------------------------------------------------------
// ระบบโฟลเดอร์ (ซ้อนกี่ชั้นก็ได้) + ลิงก์แชร์เฉพาะโฟลเดอร์
// ------------------------------------------------------------------
function addFolder(name, parentId, username) {
  try {
    if(!name || !String(name).trim()) return { success: false, message: "กรุณาพิมพ์ชื่อโฟลเดอร์" };
    const ss = getSS();
    let sheet = ss.getSheetByName("Folders");
    if(!sheet) { sheet = ss.insertSheet("Folders"); sheet.appendRow(["ID", "Name", "ParentID", "ShareToken", "ShareEnabled", "CreatedBy"]); }
    const data = sheet.getDataRange().getDisplayValues();
    for(let i=1; i<data.length; i++) {
      if(String(data[i][1]).trim() === String(name).trim() && String(data[i][2] || "") === String(parentId || "")) {
        return { success: false, message: "มีโฟลเดอร์ชื่อนี้อยู่แล้วในตำแหน่งเดียวกัน" };
      }
    }
    sheet.appendRow(["FLD_" + Utilities.getUuid().substring(0,8), String(name).trim(), parentId || "", "", "FALSE", username || "guest"]);
    logActivity(`${username || "ผู้ใช้"} สร้างโฟลเดอร์: ${name}`);
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function deleteFolder(folderId, username) {
  try {
    const ss = getSS();
    const sheet = ss.getSheetByName("Folders");
    if(!sheet) return { success: false, message: "ไม่พบชีต Folders" };
    const data = sheet.getDataRange().getDisplayValues();
    let rowIndex = -1;
    for(let i=1; i<data.length; i++) {
      if(String(data[i][0]) === String(folderId)) { rowIndex = i + 1; break; }
    }
    if(rowIndex === -1) return { success: false, message: "ไม่พบโฟลเดอร์" };

    // ป้องกันลบตอนยังมีของข้างใน
    for(let i=1; i<data.length; i++) {
      if(String(data[i][2] || "") === String(folderId)) {
        return { success: false, message: "โฟลเดอร์นี้มีโฟลเดอร์ย่อยอยู่ กรุณาลบโฟลเดอร์ย่อยออกก่อน" };
      }
    }
    const docSheet = ss.getSheetByName(SHEET_NAME);
    if(docSheet) {
      const dData = docSheet.getDataRange().getDisplayValues();
      for(let i=1; i<dData.length; i++) {
        if(dData[i][9] && String(dData[i][9]) === String(folderId)) {
          return { success: false, message: "โฟลเดอร์นี้มีไฟล์อยู่ข้างใน กรุณาย้ายหรือลบไฟล์ออกก่อน" };
        }
      }
    }

    sheet.deleteRow(rowIndex);
    logActivity(`${username || "ผู้ใช้"} ลบโฟลเดอร์ ID: ${folderId}`);
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function setFolderShare(folderId, enabled, username) {
  try {
    const ss = getSS();
    const sheet = ss.getSheetByName("Folders");
    if(!sheet) return { success: false, message: "ไม่พบชีต Folders" };
    const data = sheet.getDataRange().getDisplayValues();
    for(let i=1; i<data.length; i++) {
      if(String(data[i][0]) === String(folderId)) {
        if(enabled) {
          let token = data[i][3] ? String(data[i][3]) : "";
          if(!token) token = Utilities.getUuid().substring(0, 12);
          sheet.getRange(i+1, 4).setValue(token);
          sheet.getRange(i+1, 5).setValue("TRUE");
          logActivity(`${username || "ผู้ใช้"} เปิดแชร์โฟลเดอร์: ${data[i][1]}`);
          return { success: true, token: token };
        } else {
          sheet.getRange(i+1, 5).setValue("FALSE");
          logActivity(`${username || "ผู้ใช้"} ปิดแชร์โฟลเดอร์: ${data[i][1]}`);
          return { success: true, token: "" };
        }
      }
    }
    return { success: false, message: "ไม่พบโฟลเดอร์" };
  } catch(e) { return { success: false, message: e.toString() }; }
}

// หน้าแชร์สาธารณะ: ให้คนมีลิงก์ดูไฟล์ในโฟลเดอร์ + โฟลเดอร์ย่อยทั้งหมด (อ่านอย่างเดียว)
function getFolderByToken(token, requestedFolderId) {
  try {
    if(!token) return { success: false, message: "ลิงก์ไม่ถูกต้อง" };
    const ss = getSS();
    const folderSheet = ss.getSheetByName("Folders");
    if(!folderSheet) return { success: false, message: "ยังไม่มีระบบโฟลเดอร์" };
    const fData = folderSheet.getDataRange().getDisplayValues();

    let target = null;
    for(let i=1; i<fData.length; i++) {
      if(fData[i][3] && String(fData[i][3]) === String(token) && String(fData[i][4]).toUpperCase() === "TRUE") {
        target = fData[i];
        break;
      }
    }
    if(!target) return { success: false, message: "ลิงก์นี้ไม่ถูกต้อง หรือถูกปิดการแชร์ไปแล้ว" };

    // สร้างแผนที่ความสัมพันธ์โฟลเดอร์
    const idToName = {}, parentOf = {}, childrenOf = {};
    for(let i=1; i<fData.length; i++) {
      if(!fData[i][0]) continue;
      const id = String(fData[i][0]);
      idToName[id] = String(fData[i][1]);
      const p = fData[i][2] ? String(fData[i][2]) : "";
      parentOf[id] = p;
      if(!childrenOf[p]) childrenOf[p] = [];
      childrenOf[p].push(id);
    }

    const rootId = String(target[0]);
    let currentId = requestedFolderId ? String(requestedFolderId) : rootId;
    const descendants = {};
    const queue = [rootId];
    while(queue.length > 0) {
      const cur = queue.shift();
      (childrenOf[cur] || []).forEach(function(childId) { descendants[childId] = true; queue.push(childId); });
    }
    if(currentId !== rootId && !descendants[currentId]) return { success: false, message: "โฟลเดอร์นี้อยู่นอกลิงก์แชร์" };

    // เส้นทาง breadcrumb
    const path = [idToName[currentId] || String(target[1])];
    let pid = parentOf[currentId] || "";
    let guard = 0;
    while(pid && idToName[pid] && guard < 20) { path.unshift(idToName[pid]); pid = parentOf[pid] || ""; guard++; }

    // เอกสารในโฟลเดอร์ + โฟลเดอร์ย่อย
    const docSheet = ss.getSheetByName(SHEET_NAME);
    let documents = [];
    if(docSheet) {
      const dData = docSheet.getDataRange().getDisplayValues();
      for(let i=1; i<dData.length; i++) {
        const fid = dData[i][9] ? String(dData[i][9]) : "";
        if(fid === currentId) {
          documents.push({ title: String(dData[i][2] || "ไม่มีชื่อ"), uploader: dData[i][4] ? String(dData[i][4]) : "-", docType: dData[i][8] ? String(dData[i][8]) : "ทั่วไป", fileUrl: dData[i][5] ? String(dData[i][5]) : "#", folderName: idToName[fid] || "" });
        }
      }
    }

    // ชื่อโฟลเดอร์ย่อยชั้นแรก (ไว้แสดงหัวข้อกลุ่ม)
    const subfolders = (childrenOf[currentId] || []).map(function(id) { return { id: id, name: idToName[id] || id }; });

    return { success: true, folder: { id: currentId, name: idToName[currentId] || String(target[1]), parentId: parentOf[currentId] || "" }, path: path, subfolders: subfolders, documents: documents };
  } catch(e) { return { success: false, message: e.toString() }; }
}

// ------------------------------------------------------------------
// จัดการเอกสาร: ลบ / แก้ชื่อ / ย้ายโฟลเดอร์ / ยอดวิว
// (docId อยู่ในรูป DOC_แถว ซึ่ง map กับเลขแถวในชีตโดยตรง)
// ------------------------------------------------------------------
function row6ToBox(v) { return v ? (Number(String(v).replace(/[^0-9]/g, '')) || 0) : 0; }

function getDocRow(sheet, docId) {
  const m = String(docId || "").match(/^DOC_(\d+)$/);
  if(!m) return -1;
  // DOC_n ถูกสร้างจาก data[n] ซึ่งคือแถวที่ n+1 ของชีต (แถวแรกคือหัวตาราง)
  const rowNum = Number(m[1]) + 1;
  if(rowNum < 2 || rowNum > sheet.getLastRow()) return -1;
  return rowNum;
}

function isAdminUser(ss, username) {
  const users = ss.getSheetByName("Users");
  if(!users || !username) return false;
  const rows = users.getDataRange().getDisplayValues();
  for(let i=1; i<rows.length; i++) {
    if(String(rows[i][0]) === String(username) && String(rows[i][2]).toLowerCase() === "admin") return true;
  }
  return false;
}

function deleteDocument(docId, username) {
  try {
    const ss = getSS();
    if(!isAdminUser(ss, username)) return { success: false, message: "เฉพาะแอดมินเท่านั้นที่ลบไฟล์ได้" };
    const sheet = ss.getSheetByName(SHEET_NAME);
    if(!sheet) return { success: false, message: "ไม่พบชีต Database" };
    const rowNum = getDocRow(sheet, docId);
    if(rowNum < 1) return { success: false, message: "ไม่พบเอกสารนี้ (ข้อมูลอาจถูกอัปเดตแล้ว ลองรีเฟรชใหม่)" };

    const title = sheet.getRange(rowNum, 3).getDisplayValue();
    const url = String(sheet.getRange(rowNum, 6).getDisplayValue() || "");
    // ย้ายไฟล์จริงใน Drive ไปถังขยะ (ถ้าเป็นลิงก์ Drive ของเรา)
    if(url.indexOf('drive.google.com') > -1) {
      try {
        const fid = url.match(/[-\w]{25,}/);
        if(fid) DriveApp.getFileById(fid[0]).setTrashed(true);
      } catch(e) { Logger.log(e); }
    }
    sheet.deleteRow(rowNum);
    logActivity(`${username || "ผู้ใช้"} ลบเอกสาร: ${title}`);
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function renameDocument(docId, newTitle, username) {
  try {
    if(!newTitle || !String(newTitle).trim()) return { success: false, message: "กรุณาพิมพ์ชื่อใหม่" };
    const ss = getSS();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if(!sheet) return { success: false, message: "ไม่พบชีต Database" };
    const rowNum = getDocRow(sheet, docId);
    if(rowNum < 1) return { success: false, message: "ไม่พบเอกสารนี้" };
    sheet.getRange(rowNum, 3).setValue(String(newTitle).trim());
    logActivity(`${username || "ผู้ใช้"} แก้ชื่อเอกสารเป็น: ${newTitle}`);
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function moveDocument(docId, newFolderId, username) {
  try {
    const ss = getSS();
    if(!isAdminUser(ss, username)) return { success: false, message: "เฉพาะแอดมินเท่านั้นที่ย้ายไฟล์ได้" };
    const sheet = ss.getSheetByName(SHEET_NAME);
    if(!sheet) return { success: false, message: "ไม่พบชีต Database" };
    const rowNum = getDocRow(sheet, docId);
    if(rowNum < 1) return { success: false, message: "ไม่พบเอกสารนี้" };
    const targetId = newFolderId === "__ROOT__" ? "" : String(newFolderId || "");
    const folderPath = targetId ? getFolderPath(ss, targetId) : "";

    const url = String(sheet.getRange(rowNum, 6).getDisplayValue() || "");
    if(url.indexOf('drive.google.com') > -1) {
      const fid = url.match(/[-\w]{25,}/);
      if(fid) {
        const targetFolder = getDriveFolderForSystemFolder(ss, targetId);
        DriveApp.getFileById(fid[0]).moveTo(targetFolder);
      }
    }
    sheet.getRange(rowNum, 10).setValue(targetId);
    sheet.getRange(rowNum, 7).setValue(folderPath || "ทั่วไป");
    logActivity(`${username || "ผู้ใช้"} ย้ายเอกสารไปโฟลเดอร์: ${folderPath || "ไม่ได้จัดโฟลเดอร์"}`);
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function trackView(docId) {
  try {
    const ss = getSS();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if(!sheet) return { success: false };
    const rowNum = getDocRow(sheet, docId);
    if(rowNum < 1) return { success: false };
    const current = Number(String(sheet.getRange(rowNum, 11).getDisplayValue() || "0").replace(/[^0-9]/g, '')) || 0;
    sheet.getRange(rowNum, 11).setValue(current + 1);
    return { success: true };
  } catch(e) { return { success: false }; }
}

// ทบทวนแฟลชการ์ดแบบ Leitner: จำได้ = กล่องขยับขึ้น (สูงสุด 5) / ลืม = กลับกล่อง 0
function reviewFlashcard(id, remembered) {
  try {
    const ss = getSS();
    const sheet = ss.getSheetByName("Flashcards");
    if(!sheet) return { success: false };
    const data = sheet.getDataRange().getDisplayValues();
    for(let i=1; i<data.length; i++) {
      if(String(data[i][0]) === String(id)) {
        const box = row6ToBox(data[i][6]);
        const newBox = String(remembered) === 'true' ? Math.min(box + 1, 5) : 0;
        sheet.getRange(i+1, 7).setValue(newBox);
        return { success: true, box: newBox };
      }
    }
    return { success: false };
  } catch(e) { return { success: false }; }
}

// ------------------------------------------------------------------
// 🔔 แจ้งเตือนผ่าน LINE Messaging API (ค่าว่าง = ปิดใช้งาน)
// ใช้ broadcast ถ้าไม่ได้ตั้ง target (ส่งหาทุกคนที่เพิ่มบอทเป็นเพื่อน)
// ------------------------------------------------------------------
function sendLineMessage(text) {
  try {
    const ss = getSS();
    const settingsSheet = ss.getSheetByName("Settings");
    if(!settingsSheet) return false;
    const data = settingsSheet.getDataRange().getDisplayValues();
    let token = "", target = "";
    for(let i=1; i<data.length; i++) {
      if(String(data[i][0]) === 'lineToken') token = String(data[i][1] || '').trim();
      if(String(data[i][0]) === 'lineTarget') target = String(data[i][1] || '').trim();
    }
    if(!token) return false;

    const endpoint = target ? 'https://api.line.me/v2/bot/message/push' : 'https://api.line.me/v2/bot/message/broadcast';
    const body = { messages: [{ type: 'text', text: String(text).substring(0, 1800) }] };
    if(target) body.to = target;

    const resp = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + token },
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    });
    Logger.log('LINE notify: ' + resp.getResponseCode() + ' ' + resp.getContentText());
    return resp.getResponseCode() === 200;
  } catch(e) { Logger.log(e); return false; }
}

function formatLineDate(date) {
  return Utilities.formatDate(date || new Date(), Session.getScriptTimeZone() || 'Asia/Bangkok', 'dd/MM/yyyy HH:mm');
}

function setLineConfig(token, target, username) {
  try {
    updateSettings({ lineToken: String(token || '').trim(), lineTarget: String(target || '').trim() }, username);
    logActivity(`${username || "แอดมิน"} อัปเดตการตั้งค่าแจ้งเตือน LINE`);
    return { success: true, message: 'บันทึกค่า LINE เรียบร้อย' };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function testLineMessage() {
  const ok = sendLineMessage('✅ ทดสอบจาก PHUMSHOP 02 — ถ้าเห็นข้อความนี้แปลว่าเชื่อมต่อ LINE สำเร็จแล้ว');
  return ok
    ? { success: true, message: 'ส่งข้อความทดสอบแล้ว ไปดูใน LINE ของคุณ' }
    : { success: false, message: 'ส่งไม่สำเร็จ — ตรวจ Channel Access Token ให้แน่ใจ (ยาวประมาณ 170+ ตัวอักษร) และต้องมีคนเพิ่มบอทเป็นเพื่อนอย่างน้อย 1 คน' };
}

// ------------------------------------------------------------------
// ❤️ รายการโปรด (ผูกกับ URL ของไฟล์ซึ่งเป็นค่าคงที่ ไม่ผูกเลขแถว
//    เพื่อไม่ให้พังเมื่อมีไฟล์ถูกลบแล้วแถวชีตเลื่อน)
// ------------------------------------------------------------------
function toggleFavorite(username, fileUrl, docTitle) {
  try {
    if(!fileUrl) return { success: false, message: "ไม่พบลิงก์ไฟล์" };
    const ss = getSS();
    let sheet = ss.getSheetByName("Favorites");
    if(!sheet) { sheet = ss.insertSheet("Favorites"); sheet.appendRow(["Username", "FileUrl", "DocTitle", "SavedAt"]); }
    const data = sheet.getDataRange().getDisplayValues();
    for(let i=1; i<data.length; i++) {
      if(String(data[i][0]) === String(username || "guest") && String(data[i][1]) === String(fileUrl)) {
        sheet.deleteRow(i + 1);
        return { success: true, favorited: false };
      }
    }
    sheet.appendRow([username || "guest", String(fileUrl), docTitle || "", Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm")]);
    return { success: true, favorited: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function getMyFavorites(username) {
  try {
    const ss = getSS();
    const sheet = ss.getSheetByName("Favorites");
    if(!sheet) return { success: true, favorites: [] };
    const data = sheet.getDataRange().getDisplayValues();
    const favs = [];
    for(let i=1; i<data.length; i++) {
      if(String(data[i][0]) === String(username || "guest") && data[i][1]) {
        favs.push({ fileUrl: String(data[i][1]), title: String(data[i][2] || "") });
      }
    }
    return { success: true, favorites: favs };
  } catch(e) { return { success: true, favorites: [] }; }
}

// ------------------------------------------------------------------
// 🚨 แจ้งลิงก์เสีย → บันทึก log + ส่ง LINE หาแอดมิน (ถ้าตั้งค่าไว้)
// ------------------------------------------------------------------
function reportBrokenLink(docId, username, note) {
  try {
    const ss = getSS();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if(!sheet) return { success: false, message: "ไม่พบชีต Database" };
    const rowNum = getDocRow(sheet, docId);
    if(rowNum < 1) return { success: false, message: "ไม่พบเอกสารนี้" };
    const title = sheet.getRange(rowNum, 3).getDisplayValue();
    const url = String(sheet.getRange(rowNum, 6).getDisplayValue() || "");
    logActivity(`🚨 ${username || "ผู้ใช้"} แจ้งลิงก์เสีย: ${title}`);
    const lineSent = sendLineMessage(`🚨 แจ้งลิงก์เสีย\n📄 ${title}\n🔗 ${url}\n👤 แจ้งโดย ${username || "ผู้ใช้"}${note ? "\n📝 " + note : ""}`);
    return { success: true, lineSent: lineSent };
  } catch(e) { return { success: false, message: e.toString() }; }
}

// ------------------------------------------------------------------
// 🔐 เปลี่ยนรหัสผ่านของตัวเอง (ตรวจรหัสเดิมก่อนทุกครั้ง)
// ------------------------------------------------------------------
function changePassword(username, oldPassword, newPassword) {
  try {
    username = String(username || '').trim();
    if(!username) return { success: false, message: "กรุณาเข้าสู่ระบบก่อน" };
    newPassword = String(newPassword || '');
    if(newPassword.length < 4) return { success: false, message: "รหัสผ่านใหม่ต้องยาวอย่างน้อย 4 ตัวอักษร" };
    const ss = getSS();
    const sheet = ss.getSheetByName("Users");
    if(!sheet) return { success: false, message: "ไม่พบชีต Users" };
    const data = sheet.getDataRange().getDisplayValues();
    for(let i=1; i<data.length; i++) {
      if(String(data[i][0]) === username) {
        if(String(data[i][1]) !== String(oldPassword)) {
          return { success: false, message: "รหัสผ่านเดิมไม่ถูกต้อง" };
        }
        sheet.getRange(i + 1, 2).setValue(newPassword);
        logActivity(`${username} เปลี่ยนรหัสผ่านเรียบร้อย`);
        return { success: true };
      }
    }
    return { success: false, message: "ไม่พบบัญชีผู้ใช้นี้" };
  } catch(e) { return { success: false, message: e.toString() }; }
}

// ------------------------------------------------------------------
// 🔄 นำเข้าจาก Drive: สแกนโครงสร้างโฟลเดอร์ใน Drive หลัก
//    สร้างโฟลเดอร์ในระบบให้ตรงโครง + ลงทะเบียนไฟล์ที่ยังไม่มีอัตโนมัติ
//    (ไฟล์ที่ลงทะเบียนแล้วจะข้าม ทำซ้ำได้ปลอดภัย)
// ------------------------------------------------------------------
function syncFromDrive(username) {
  try {
    const ss = getSS();
    const folderSheet = ss.getSheetByName("Folders");
    const docSheet = ss.getSheetByName(SHEET_NAME);
    if(!folderSheet || !docSheet) return { success: false, message: "ยังไม่พบชีต Folders/Database — กรุณารัน setupSheet ก่อน" };

    const root = DriveApp.getFolderById(FOLDER_ID);
    let createdFolders = 0, createdDocs = 0, skipped = 0;
    const MAX_ITEMS = 400; // กันเกินเวลา 6 นาทีของ Apps Script ต่อรอบ

    // URL ของไฟล์ที่ลงทะเบียนแล้ว (คอลัมน์ F)
    const existingUrls = {};
    const dData = docSheet.getDataRange().getDisplayValues();
    for(let i=1; i<dData.length; i++) { if(dData[i][5]) existingUrls[String(dData[i][5])] = true; }

    function registerFile(file, systemFolderId, folderPath) {
      if(file.getName().indexOf("FC_") === 0) return; // ข้ามรูปแฟลชการ์ด
      if(existingUrls[file.getUrl()]) { skipped++; return; }
      const cleanName = file.getName().replace(/\.[^.]+$/, "");
      docSheet.appendRow([new Date(), "-", cleanName, "Sync จาก Drive", username || "system", file.getUrl(), folderPath || "ทั่วไป", file.getName(), "ทั่วไป", systemFolderId || "", 0]);
      existingUrls[file.getUrl()] = true;
      createdDocs++;
    }

    // หา/สร้างโฟลเดอร์ระบบให้ตรงกับโครง Drive (จับคู่ด้วย ชื่อ + โฟลเดอร์แม่)
    function ensureSystemFolder(name, parentSystemId) {
      const data = folderSheet.getDataRange().getDisplayValues();
      for(let i=1; i<data.length; i++) {
        if(String(data[i][1]).trim() === name.trim() && String(data[i][2] || "") === String(parentSystemId || "")) {
          return String(data[i][0]);
        }
      }
      const newId = "FLD_" + Utilities.getUuid().substring(0,8);
      folderSheet.appendRow([newId, name.trim(), parentSystemId || "", "", "FALSE", username || "system"]);
      createdFolders++;
      return newId;
    }

    // ไฟล์ที่กองอยู่ระดับบนสุด (ยังไม่ได้จัดโฟลเดอร์)
    const rootFiles = root.getFiles();
    while(rootFiles.hasNext() && createdDocs + skipped < MAX_ITEMS) {
      registerFile(rootFiles.next(), "", "");
    }

    // เดินลงไปในโฟลเดอร์ย่อยทุกชั้น
    const stack = [{ drive: root, systemId: "" }];
    while(stack.length > 0 && createdDocs + skipped < MAX_ITEMS) {
      const node = stack.pop();
      const subFolders = node.drive.getFolders();
      while(subFolders.hasNext() && createdDocs + skipped < MAX_ITEMS) {
        const df = subFolders.next();
        const sysId = ensureSystemFolder(df.getName(), node.systemId);
        const sysPath = getFolderPath(ss, sysId);
        const files = df.getFiles();
        while(files.hasNext() && createdDocs + skipped < MAX_ITEMS) {
          registerFile(files.next(), sysId, sysPath);
        }
        stack.push({ drive: df, systemId: sysId });
      }
    }

    let message = `นำเข้าสำเร็จ: สร้างโฟลเดอร์ ${createdFolders} อัน, ลงทะเบียนไฟล์ใหม่ ${createdDocs} ไฟล์` + (skipped > 0 ? ` (ข้ามของเดิม ${skipped})` : "");
    if(createdDocs + skipped >= MAX_ITEMS) message += ` — ถึงขีดจำกัด ${MAX_ITEMS} รายการต่อรอบ ถ้ายังมีเหลือให้กด Sync อีกครั้ง`;
    logActivity(`${username || "ผู้ใช้"} Sync จาก Drive: +${createdFolders} โฟลเดอร์, +${createdDocs} ไฟล์`);
    if(createdDocs > 0) sendLineMessage(`🔄 Sync จาก Drive: ลงทะเบียนไฟล์ใหม่ ${createdDocs} ไฟล์ (โฟลเดอร์ใหม่ ${createdFolders} อัน)`);
    return { success: true, message: message, createdFolders: createdFolders, createdDocs: createdDocs, skipped: skipped };
  } catch(e) { return { success: false, message: e.toString() }; }
}

// ขนาดพื้นที่ Drive ที่ใช้ไป (สำหรับสถิติแดชบอร์ด)
function getDriveUsage() {
  try {
    const root = DriveApp.getFolderById(FOLDER_ID);
    let total = 0, count = 0;
    const stack = [root];
    while(stack.length > 0 && count < 1500) {
      const folder = stack.pop();
      const files = folder.getFiles();
      while(files.hasNext() && count < 1500) {
        const file = files.next();
        total += file.getSize() || 0;
        count++;
      }
      const subs = folder.getFolders();
      while(subs.hasNext()) stack.push(subs.next());
    }
    return { success: true, files: count, bytes: total };
  } catch(e) { return { success: false, files: 0, bytes: 0 }; }
}

// ------------------------------------------------------------------
// 🚀 ตัวช่วยติดตั้งระบบอัตโนมัติ — รันครั้งเดียว สร้างทุกอย่างให้ครบ
// วิธีใช้: เปิด Google Sheet ใหม่ → Extensions → Apps Script →
//          วางโค้ดนี้ทั้งไฟล์ → เลือกฟังก์ชัน setupSheet → กด Run
// ------------------------------------------------------------------
function setupSheet() {
  const ss = getSS();
  if (!ss) return { success: false, message: 'หาสเปรดชีตไม่ได้ — กรุณาเปิด Apps Script ผ่านเมนู Extensions ในตัวชีต (ไม่ใช่สร้างแยกที่ script.google.com)' };

  try {
    setupAllSheets(ss);
    return { success: true, message: 'ติดตั้งครบแล้ว! สร้างชีตทั้ง 7 แท็บ + บัญชี admin/1234 (โปรดเปลี่ยนรหัสทันที)' };
  } catch(e) {
    return { success: false, message: 'ติดตั้งไม่สำเร็จ: ' + e.toString() + ' — ถ้าเป็นเรื่องสิทธิ์ ให้ไปลบการเข้าถึงที่ myaccount.google.com/connections แล้วกด Run ใหม่ เพื่อขอสิทธิ์ใหม่อีกครั้ง' };
  }
}

function setupAllSheets(ss) {
  const HEADER_BG = "#eef2ff";

  // 1) Database — คลังเอกสาร (10 คอลัมน์ ห้ามสลับลำดับ)
  let db = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (db.getLastRow() === 0) {
    db.appendRow(["วันที่", "หมายเหตุ", "ชื่อเอกสาร", "ประเภทการเพิ่ม", "ผู้อัปโหลด", "ลิงก์ไฟล์", "หมวดหมู่/วิชา", "ชื่อไฟล์เดิม", "ประเภทเนื้อหา", "FolderID"]);
    db.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground(HEADER_BG);
  } else {
    // ชีตเดิม — ซ่อมหัวตารางเป็นชุดมาตรฐาน (กันค่าเพี้ยนจากอดีต) โดยไม่แตะข้อมูลแถวอื่นเลย
    db.getRange(1, 1, 1, 11).setValues([["วันที่", "หมายเหตุ", "ชื่อเอกสาร", "ประเภทการเพิ่ม", "ผู้อัปโหลด", "ลิงก์ไฟล์", "หมวดหมู่/วิชา", "ชื่อไฟล์เดิม", "ประเภทเนื้อหา", "FolderID", "ViewCount"]]);
    db.getRange(1, 1, 1, 11).setFontWeight("bold").setBackground(HEADER_BG);
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
    fc.appendRow(["ID", "Username", "SubjectID", "Question", "Answer", "ImageURL", "BoxLevel"]);
    fc.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground(HEADER_BG);
  } else if (fc.getLastColumn() < 7) {
    fc.getRange(1, 7).setValue("BoxLevel").setFontWeight("bold").setBackground(HEADER_BG);
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

  // 8) Folders — โครงสร้างโฟลเดอร์ซ้อนชั้น
  let fold = ss.getSheetByName("Folders") || ss.insertSheet("Folders");
  if (fold.getLastRow() === 0) {
    fold.appendRow(["ID", "Name", "ParentID", "ShareToken", "ShareEnabled", "CreatedBy"]);
    fold.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground(HEADER_BG);
  }

  // 9) Favorites — รายการโปรดรายคน (ผูกกับ URL ไฟล์)
  let favs = ss.getSheetByName("Favorites") || ss.insertSheet("Favorites");
  if (favs.getLastRow() === 0) {
    favs.appendRow(["Username", "FileUrl", "DocTitle", "SavedAt"]);
    favs.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground(HEADER_BG);
  }

  // ลบแท็บ Sheet1 เปล่าที่ Google สร้างมาให้ตอนแรก
  const sheet1 = ss.getSheetByName("Sheet1");
  if (sheet1 && sheet1.getLastRow() === 0) { try { ss.deleteSheet(sheet1); } catch(e) {} }
}
