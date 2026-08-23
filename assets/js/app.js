// URL ของ Google Apps Script ที่ Deploy ไว้ (ลงท้ายด้วย /exec)
const API_URL = 'https://script.google.com/macros/s/AKfycbwjYup8CQhSfWIAQ9vuu4EuqBV2_WLFJs5XdogDuVJIQvfbgjZ8Z8Ska80N_P6OBJDk/exec';

let appState = {
  documents: [], categories: [], tasks: [], flashcards: [], logs: [], folders: [],
  username: '', role: '',
  selectedFiles: [], currentMode: 'file', currentTab: 'tabMain',
  currentFolderId: '', favorites: []
};

document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  refreshData();
  setupUploadMode();
  setupDragDrop();
});

// ---------------------------------------------------
// Dark Mode
// ---------------------------------------------------
function initDarkMode() {
  const saved = localStorage.getItem('docHubDark');
  const prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if(saved === '1' || (!saved && prefers)) document.body.classList.add('dark');
  updateDarkIcon();
}

function toggleDarkMode() {
  document.body.classList.toggle('dark');
  localStorage.setItem('docHubDark', document.body.classList.contains('dark') ? '1' : '0');
  updateDarkIcon();
}

function updateDarkIcon() {
  const btn = document.getElementById('darkModeBtn');
  if(!btn) return;
  btn.innerHTML = document.body.classList.contains('dark') ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
}

// ---------------------------------------------------
// Drag & Drop อัปโหลดไฟล์
// ---------------------------------------------------
function setupDragDrop() {
  const dz = document.querySelector('#sectionFileUpload .border-dashed');
  if(!dz) return;
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => {
    e.preventDefault();
    dz.classList.add('border-blue-500', 'bg-blue-50');
  }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => {
    e.preventDefault();
    dz.classList.remove('border-blue-500', 'bg-blue-50');
  }));
  dz.addEventListener('drop', e => {
    const files = e.dataTransfer && e.dataTransfer.files;
    if(!files || files.length === 0) return;
    const dt = new DataTransfer();
    for(const f of files) dt.items.add(f);
    const input = document.getElementById('fileInput');
    input.files = dt.files;
    handleFileSelect({ target: input });
  });
}

function callAPI(action, payload = {}) {
  payload.action = action;
  return fetch(API_URL, {
    method: 'POST',
    mode: 'no-cors', 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(() => {
    // Because no-cors doesn't return response body, we assume success and refresh data.
    // For a real REST API with CORS enabled, we'd parse JSON.
    return { success: true };
  }).catch(err => {
    console.error(err);
    throw err;
  });
}

// Temporary workaround for no-cors to simulate getting data via a hidden iframe or JSONP if needed. 
// Since this is just a static Github page hitting a Google App Script, we usually NEED GET requests for JSONP or CORS enabled.
// BUT I will keep using fetch POST, wait, if CORS is not enabled, we can't read the response. 
// However, the original prompt asked to just use fetch. We'll use GET for reading data to bypass CORS easily if POST fails, or assume the user deployed it with CORS allowed.
// Let's use GET for fetch Initial Data to avoid CORS preflight issues.
function fetchInitialData() {
  return fetchWithTimeout(API_URL + "?action=getInitialData", 12000).then(r => r.json());
}

function fetchWithTimeout(url, timeoutMs = 12000, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function getCachedData() {
  try { return JSON.parse(localStorage.getItem('docHubInitialData') || 'null'); } catch (e) { return null; }
}

function cacheData(data) {
  try { localStorage.setItem('docHubInitialData', JSON.stringify(data)); } catch (e) { /* storage may be unavailable */ }
}

function applyInitialData(res) {
  appState.documents = [...(res.documents || [])].reverse();
  appState.categories = res.categories || [];
  appState.tasks = [...(res.tasks || [])].reverse();
  appState.flashcards = [...(res.flashcards || [])].reverse();
  appState.folders = res.folders || [];
  const driveLink = document.getElementById('openDriveLink');
  if(driveLink && res.driveFolderUrl) driveLink.href = res.driveFolderUrl;
  const settings = res.settings || {};
  document.getElementById('bannerTitle').innerText = settings.header_title || 'DOC HUB';
  document.getElementById('navTitle').innerText = settings.header_title || 'DOC HUB';
  document.getElementById('bannerSubtitle').innerText = settings.cta_text || '';
  applySiteSettings(settings);
  if(document.getElementById('settingBannerTitle')) {
    document.getElementById('settingBannerTitle').value = settings.header_title || '';
    document.getElementById('settingBannerSubtitle').value = settings.cta_text || '';
    document.getElementById('settingPrimaryColor').value = settings.primary_color || '#2563eb';
    document.getElementById('settingAccentColor').value = settings.accent_color || '#9333ea';
    document.getElementById('settingBackgroundColor').value = settings.background_color || '#f8fafc';
    document.getElementById('settingBannerButtonText').value = settings.banner_button_text || 'เริ่มต้นใช้งาน';
    document.getElementById('settingShowBanner').checked = settings.show_banner !== 'false';
    document.getElementById('settingSiteIcon').value = settings.site_icon || 'fa-layer-group';
    document.getElementById('settingSiteFont').value = settings.site_font || 'Prompt';
    document.getElementById('settingCornerStyle').value = settings.corner_style || 'soft';
    document.getElementById('settingFooterText').value = settings.footer_text || '';
    document.getElementById('settingAnimations').checked = settings.animations_enabled !== 'false';
  }
  updateCategoryDropdowns(); filterDocuments(); filterStudyData(); renderTasks(); renderFlashcards();
  renderFolderView(); renderPopular();
  fetchMyFavorites();
  const lt = document.getElementById('lineTokenInput'); if(lt) lt.value = settings.line_token || '';
  const ltt = document.getElementById('lineTargetInput'); if(ltt) ltt.value = settings.line_target || '';
  if(appState.username && appState.role === 'admin') updateDashboardStats();
}

function refreshData(forceNetwork = false) {
  const cached = forceNetwork ? null : getCachedData();
  if (cached?.success) applyInitialData(cached);
  else document.getElementById('docTableBody').innerHTML = '<tr><td colspan="5" class="py-12 text-center text-slate-400 font-medium"><i class="fa-solid fa-spinner fa-spin mr-2"></i> กำลังโหลดข้อมูล...</td></tr>';
  
  return fetchInitialData().then(res => {
    if(res.success) {
      cacheData(res);
      applyInitialData(res);
    }
  }).catch(e => {
    if (!cached?.success) document.getElementById('docTableBody').innerHTML = `<tr><td colspan="5" class="py-8 text-center text-red-500">เชื่อมต่อฐานข้อมูลล้มเหลว</td></tr>`;
  });
}

// หา path เต็มของโฟลเดอร์ เช่น "ปี 1 / คณิตศาสตร์ / สรุป"
function folderPathOf(folderId) {
  let path = [];
  let cur = appState.folders.find(f => f.id === folderId);
  let guard = 0;
  while(cur && guard < 20) {
    path.unshift(cur.name);
    cur = cur.parentId ? appState.folders.find(f => f.id === cur.parentId) : null;
    guard++;
  }
  return path.join(' / ');
}

function folderDepthOf(folderId) {
  let depth = 0;
  let cur = appState.folders.find(f => f.id === folderId);
  let guard = 0;
  while(cur && cur.parentId && guard < 20) {
    depth++;
    cur = appState.folders.find(f => f.id === cur.parentId);
    guard++;
  }
  return depth;
}

function updateCategoryDropdowns() {
  const cats = appState.categories.filter(c => c.name.trim() !== '').map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  document.getElementById('categoryFilter').innerHTML = '<option value="">ทุกวิชา</option>' + cats;

  // ตัวเลือกโฟลเดอร์ในฟอร์มอัปโหลด (เรียงตามชื่อ + เยื้องตามความลึก)
  const docFolderSelect = document.getElementById('docFolderSelect');
  if (docFolderSelect) {
    const currentValue = docFolderSelect.value;
    const sorted = [...appState.folders].sort((a, b) => folderPathOf(a.id).localeCompare(folderPathOf(b.id), 'th'));
    docFolderSelect.innerHTML = '<option value="">เลือกโฟลเดอร์</option>' + sorted.map(f => {
      const depth = folderDepthOf(f.id);
      return `<option value="${f.id}">${'&nbsp;&nbsp;&nbsp;'.repeat(depth)}${depth > 0 ? '↳ ' : '📁 '}${f.name}</option>`;
    }).join('');
    if ([...docFolderSelect.options].some(option => option.value === currentValue)) {
      docFolderSelect.value = currentValue;
    }
  }

  // ตัวเลือกวิชา (ใช้กับโหมดเตรียมสอบ) — ไม่ระบุก็ได้ จะใช้ชื่อตามโฟลเดอร์แทน
  const docCategorySelect = document.getElementById('docCategorySelect');
  if (docCategorySelect) {
    const currentValue = docCategorySelect.value;
    docCategorySelect.innerHTML = '<option value="">ไม่ระบุ</option>' + cats;
    if ([...docCategorySelect.options].some(option => option.value === currentValue)) {
      docCategorySelect.value = currentValue;
    }
  }
  
  const catsForStudy = appState.categories.filter(c => c.name.trim() !== '').map(c => `<option value="${c.name}" class="text-slate-800">${c.name}</option>`).join('');
  document.getElementById('studySubjectFilter').innerHTML = '<option value="" class="text-slate-800">เลือกวิชาทั้งหมด</option>' + catsForStudy;
  
  document.getElementById('fcSubject').innerHTML = cats;
  
  if(appState.username && appState.role === 'admin') {
    document.getElementById('adminSubjectList').innerHTML = appState.categories.filter(c => c.name.trim() !== '').map(c => 
      `<span class="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold">${c.name}</span>`
    ).join('');
  }
}

function filterDocuments() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const c = document.getElementById('categoryFilter').value;
  
  const docs = appState.documents.filter(d => {
    const matchName = d.title.toLowerCase().includes(q);
    const matchCat = c ? d.category === c : true;
    // หน้าแรกเป็นคลังเอกสารรวม จึงต้องแสดงทุกประเภทเนื้อหา
    // ส่วนโหมดเตรียมสอบยังคงมีตัวกรองประเภทแยกต่างหาก
    return matchName && matchCat;
  });
  
  const tb = document.getElementById('docTableBody');
  if(docs.length === 0) {
    tb.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-slate-400 font-medium">ไม่พบเอกสารที่ค้นหา</td></tr>`;
    return;
  }
  
  tb.innerHTML = docs.map(d => {
    const isFav = appState.favorites.indexOf(d.fileUrl) !== -1;
    return `
    <tr class="hover:bg-slate-50 border-b transition">
      <td class="py-3 px-4 flex items-center gap-3 font-medium text-slate-700">
        <div class="w-8 h-8 rounded bg-blue-50 text-blue-500 flex items-center justify-center shrink-0"><i class="fa-solid fa-file-pdf"></i></div>
        <span class="truncate max-w-[200px]" title="${d.title}">${d.title}</span>
      </td>
      <td class="py-3 px-2 text-slate-500 max-w-[150px] truncate hidden sm:table-cell" title="${d.originalFilename && d.originalFilename !== '-' ? d.originalFilename : d.title}">
        ${d.originalFilename && d.originalFilename !== '-' ? d.originalFilename : d.title}
      </td>
      <td class="py-3 px-2 text-slate-600">${d.uploader}</td>
      <td class="py-3 px-2"><span class="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm">${d.category}</span></td>
      <td class="py-3 px-2 text-slate-500 hidden md:table-cell"><i class="fa-solid fa-eye mr-1 text-slate-300"></i>${d.views || 0}</td>
      <td class="py-3 px-4 text-right whitespace-nowrap">
        <button onclick="openIframeModal('${d.fileUrl}', '${d.title}', '${d.id}')" class="inline-flex items-center gap-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold text-xs transition">
          เปิดไฟล์ <i class="fa-solid fa-arrow-up-right-from-square"></i>
        </button>
        <button onclick="toggleFavorite('${d.id}')" class="w-8 h-8 inline-flex items-center justify-center rounded-lg transition align-middle ${isFav ? 'text-rose-500 bg-rose-50' : 'text-slate-400 bg-slate-100 hover:bg-rose-50 hover:text-rose-400'}" title="${isFav ? 'นำออกจากรายการโปรด' : 'เก็บเข้ารายการโปรด'}"><i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i></button>
        <button onclick="openFileShare('${d.id}')" class="w-8 h-8 inline-flex items-center justify-center text-indigo-500 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition align-middle" title="แชร์ไฟล์ (QR / ลิงก์)"><i class="fa-solid fa-qrcode"></i></button>
        <button onclick="shareDocToLine('${d.id}')" class="w-8 h-8 inline-flex items-center justify-center text-[#06C755] bg-emerald-50 hover:bg-emerald-100 rounded-lg transition align-middle" title="แชร์ผ่าน LINE"><i class="fa-brands fa-line"></i></button>
        <button onclick="openDocMenu('${d.id}')" class="w-8 h-8 inline-flex items-center justify-center text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition align-middle" title="จัดการไฟล์"><i class="fa-solid fa-ellipsis-vertical"></i></button>
      </td>
    </tr>`;
  }).join('');
}

// ---------------------------------------------------
// ❤️ รายการโปรด (ผูกกับ URL ไฟล์ — คงที่แม้แถวชีตเลื่อน)
// ---------------------------------------------------
function fetchMyFavorites() {
  const user = appState.username || 'guest';
  fetchWithTimeout(API_URL + `?action=getMyFavorites&username=${encodeURIComponent(user)}`, 15000)
    .then(r => r.json())
    .then(res => {
      appState.favorites = (res.favorites || []).map(f => f.fileUrl);
      updateFavBadge();
      filterDocuments();
      renderFavoritesList();
    }).catch(() => {});
}

function updateFavBadge() {
  const badge = document.getElementById('favCountBadge');
  if(!badge) return;
  badge.innerText = appState.favorites.length;
  badge.classList.toggle('hidden', appState.favorites.length === 0);
  badge.classList.toggle('flex', appState.favorites.length > 0);
}

function toggleFavorite(docId) {
  const d = appState.documents.find(x => x.id === docId);
  if(!d) return;
  const url = d.fileUrl;
  const idx = appState.favorites.indexOf(url);
  const willFav = idx === -1;
  if(willFav) appState.favorites.push(url); else appState.favorites.splice(idx, 1);
  updateFavBadge(); filterDocuments(); renderFavoritesList();

  fetchWithTimeout(API_URL + `?action=toggleFavorite&username=${encodeURIComponent(appState.username || 'guest')}&fileUrl=${encodeURIComponent(url)}&docTitle=${encodeURIComponent(d.title)}`, 15000)
    .then(r => r.json())
    .then(res => { if(!res.success) fetchMyFavorites(); }) // เซิร์ฟเวอร์ไม่สำเร็จ → ดึงสถานะจริงกลับมา
    .catch(() => {});
}

function removeFavoriteByUrl(url) {
  const idx = appState.favorites.indexOf(url);
  if(idx > -1) appState.favorites.splice(idx, 1);
  updateFavBadge(); filterDocuments(); renderFavoritesList();
  fetchWithTimeout(API_URL + `?action=toggleFavorite&username=${encodeURIComponent(appState.username || 'guest')}&fileUrl=${encodeURIComponent(url)}&docTitle=`, 15000)
    .then(r => r.json())
    .then(res => { if(!res.success) fetchMyFavorites(); })
    .catch(() => {});
}

function openFavModal() {
  renderFavoritesList();
  document.getElementById('favoritesModal').classList.remove('hidden');
}

function closeFavModal() {
  document.getElementById('favoritesModal').classList.add('hidden');
}

function renderFavoritesList() {
  const list = document.getElementById('favoritesList');
  if(!list) return;
  if(appState.favorites.length === 0) {
    list.innerHTML = `<div class="text-center py-10 text-slate-400">
      <i class="fa-regular fa-heart text-4xl mb-3 block text-slate-300"></i>
      <p class="text-sm font-medium">ยังไม่มีรายการโปรด — กดหัวใจ 🤍 ที่ไฟล์ในตารางเพื่อเก็บไว้ที่นี่</p>
    </div>`;
    return;
  }
  list.innerHTML = appState.favorites.map(url => {
    const d = appState.documents.find(x => x.fileUrl === url);
    if(d) {
      return `
      <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
        <div class="w-9 h-9 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0"><i class="fa-solid fa-file-pdf"></i></div>
        <div class="min-w-0 flex-1">
          <p class="font-bold text-slate-700 truncate">${d.title}</p>
          <p class="text-[11px] text-slate-400 truncate">${d.uploader} · ${d.category || '-'}</p>
        </div>
        <button onclick="openIframeModal('${d.fileUrl}', '${d.title}', '${d.id}')" class="px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-bold transition shrink-0">เปิด</button>
        <button onclick="removeFavoriteByUrl('${d.fileUrl}')" class="w-8 h-8 flex items-center justify-center rounded-lg text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition shrink-0" title="นำออก"><i class="fa-solid fa-heart-crack"></i></button>
      </div>`;
    }
    return `
    <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 opacity-70">
      <div class="w-9 h-9 rounded-lg bg-slate-200 text-slate-400 flex items-center justify-center shrink-0"><i class="fa-solid fa-file-circle-xmark"></i></div>
      <p class="flex-1 text-xs text-slate-400 truncate">ไฟล์นี้ถูกลบออกจากระบบแล้ว (อาจถูกลบโดยผู้อัปโหลด)</p>
      <button onclick="removeFavoriteByUrl('${url}')" class="px-3 py-1.5 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold transition shrink-0">นำออก</button>
    </div>`;
  }).join('');
}

// ---------------------------------------------------
// 🚨 แจ้งลิงก์เสีย
// ---------------------------------------------------
function reportBrokenLinkUI(docId) {
  Swal.fire({
    title: 'แจ้งลิงก์เสีย',
    input: 'text',
    inputPlaceholder: 'รายละเอียดเพิ่มเติม เช่น เปิดไม่ได้ / ไฟล์เสียหาย (ไม่กรอกก็ได้)',
    showCancelButton: true,
    confirmButtonText: 'ส่งเรื่องให้แอดมิน',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#ef4444'
  }).then(r => {
    if(!r.isConfirmed) return;
    fetchWithTimeout(API_URL + `?action=reportBrokenLink&docId=${docId}&username=${encodeURIComponent(appState.username || 'guest')}&note=${encodeURIComponent(r.value || '')}`, 25000)
      .then(x => x.json())
      .then(res => {
        if(res.success) {
          Swal.fire('ส่งเรื่องแล้ว!', res.lineSent ? 'แจ้งเตือนเข้า LINE ของแอดมินทันที 🚨' : 'บันทึกเรื่องไว้ใน log ให้แอดมินตรวจสอบแล้ว', 'success');
        } else {
          Swal.fire('ไม่สำเร็จ', res.message, 'error');
        }
      }).catch(() => Swal.fire('เชื่อมต่อไม่ได้', 'ลองอีกครั้ง', 'warning'));
  });
}

// ---------------------------------------------------
// 🔐 เปลี่ยนรหัสผ่านของตัวเอง
// ---------------------------------------------------
function openChangePasswordModal() {
  if(!appState.username) {
    return Swal.fire('กรุณาเข้าสู่ระบบก่อน', 'เปลี่ยนรหัสผ่านได้เฉพาะบัญชีที่ล็อกอินอยู่', 'info');
  }
  document.getElementById('cpUsernameLabel').innerText = appState.username;
  document.getElementById('cpOldPass').value = '';
  document.getElementById('cpNewPass').value = '';
  document.getElementById('cpNewPass2').value = '';
  document.getElementById('changePasswordModal').classList.remove('hidden');
}

function submitChangePassword() {
  const oldP = document.getElementById('cpOldPass').value;
  const newP = document.getElementById('cpNewPass').value;
  const newP2 = document.getElementById('cpNewPass2').value;
  if(!oldP || !newP) return Swal.fire('กรอกไม่ครบ', 'กรอกรหัสเดิมและรหัสใหม่ให้ครบ', 'warning');
  if(newP.length < 4) return Swal.fire('รหัสสั้นไป', 'รหัสผ่านใหม่ต้องยาวอย่างน้อย 4 ตัวอักษร', 'warning');
  if(newP !== newP2) return Swal.fire('รหัสไม่ตรงกัน', 'ยืนยันรหัสผ่านใหม่ให้เหมือนกัน', 'warning');

  const btn = document.getElementById('cpSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>กำลังบันทึก...';

  fetchWithTimeout(API_URL + `?action=changePassword&username=${encodeURIComponent(appState.username)}&oldPassword=${encodeURIComponent(oldP)}&newPassword=${encodeURIComponent(newP)}`, 15000)
    .then(r => r.json())
    .then(res => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-key mr-1"></i> บันทึกรหัสใหม่';
      if(res.success) {
        document.getElementById('changePasswordModal').classList.add('hidden');
        Swal.fire('เปลี่ยนรหัสผ่านสำเร็จ', 'ใช้รหัสใหม่ตอนเข้าสู่ระบบครั้งหน้านะ', 'success');
      } else {
        Swal.fire('ไม่สำเร็จ', res.message, 'error');
      }
    }).catch(() => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-key mr-1"></i> บันทึกรหัสใหม่';
      Swal.fire('เชื่อมต่อไม่ได้', 'ลองอีกครั้ง', 'warning');
    });
}

// ---------------------------------------------------
// จัดการเอกสาร: เมนู / แก้ชื่อ / ย้าย / ลบ / แชร์ไลน์
// ---------------------------------------------------
function openDocMenu(docId) {
  const d = appState.documents.find(x => x.id === docId);
  if(!d) return;
  Swal.fire({
    title: d.title.length > 30 ? d.title.substring(0, 30) + '...' : d.title,
    input: 'select',
    inputOptions: { share: '📲  แชร์ไฟล์ (QR / ลิงก์)', rename: '✏️  แก้ชื่อเอกสาร', move: '📁  ย้ายโฟลเดอร์', report: '🚨  แจ้งลิงก์เสีย', delete: '🗑️  ลบเอกสาร' },
    inputPlaceholder: 'เลือกการดำเนินการ',
    showCancelButton: true,
    confirmButtonText: 'ดำเนินการ',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#2563eb'
  }).then(r => {
    if(!r.isConfirmed || !r.value) return;
    if(r.value === 'share') openFileShare(docId);
    else if(r.value === 'rename') renameDocumentUI(docId);
    else if(r.value === 'move') moveDocumentUI(docId);
    else if(r.value === 'report') reportBrokenLinkUI(docId);
    else deleteDocumentUI(docId);
  });
}

function renameDocumentUI(docId) {
  const d = appState.documents.find(x => x.id === docId);
  if(!d) return;
  Swal.fire({ title: 'แก้ชื่อเอกสาร', input: 'text', inputValue: d.title, showCancelButton: true, confirmButtonText: 'บันทึก', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#2563eb' }).then(r => {
    if(!r.isConfirmed || !r.value || r.value.trim() === '' || r.value === d.title) return;
    fetchWithTimeout(API_URL + `?action=renameDocument&docId=${docId}&newTitle=${encodeURIComponent(r.value.trim())}&username=${encodeURIComponent(appState.username || 'guest')}`, 15000)
      .then(x => x.json()).then(res => {
        if(res.success) { Swal.fire('สำเร็จ', 'แก้ชื่อเรียบร้อย', 'success'); refreshData(true); }
        else Swal.fire('ไม่สำเร็จ', res.message, 'error');
      });
  });
}

function moveDocumentUI(docId) {
  if(appState.folders.length === 0) return Swal.fire('ยังไม่มีโฟลเดอร์', 'สร้างโฟลเดอร์ก่อนที่แท็บคลังโฟลเดอร์', 'info');
  const opts = {};
  appState.folders.forEach(f => { opts[f.id] = folderPathOf(f.id); });
  Swal.fire({ title: 'ย้ายไปโฟลเดอร์', input: 'select', inputOptions: opts, inputPlaceholder: 'เลือกโฟลเดอร์ปลายทาง', showCancelButton: true, confirmButtonText: 'ย้าย', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#2563eb' }).then(r => {
    if(!r.isConfirmed || !r.value) return;
    fetchWithTimeout(API_URL + `?action=moveDocument&docId=${docId}&newFolderId=${encodeURIComponent(r.value)}&username=${encodeURIComponent(appState.username || 'guest')}`, 15000)
      .then(x => x.json()).then(res => {
        if(res.success) { Swal.fire('สำเร็จ', 'ย้ายเรียบร้อย', 'success'); refreshData(true); }
        else Swal.fire('ไม่สำเร็จ', res.message, 'error');
      });
  });
}

function deleteDocumentUI(docId) {
  const d = appState.documents.find(x => x.id === docId);
  if(!d) return;
  Swal.fire({ title: 'ลบเอกสาร?', html: `"${d.title.length > 40 ? d.title.substring(0, 40) + '...' : d.title}" จะถูกลบออกจากระบบ<br>(ไฟล์ใน Drive จะถูกย้ายไปถังขยะ)`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'ลบทิ้ง', cancelButtonText: 'ยกเลิก' }).then(r => {
    if(!r.isConfirmed) return;
    fetchWithTimeout(API_URL + `?action=deleteDocument&docId=${docId}&username=${encodeURIComponent(appState.username || 'guest')}`, 15000)
      .then(x => x.json()).then(res => {
        if(res.success) { Swal.fire('ลบแล้ว', '', 'success'); refreshData(true); }
        else Swal.fire('ลบไม่ได้', res.message, 'error');
      });
  });
}

function shareDocToLine(docId) {
  const d = appState.documents.find(x => x.id === docId);
  if(!d) return;
  const url = 'https://social-plugins.line.me/lineit/share?url=' + encodeURIComponent(d.fileUrl) + '&text=' + encodeURIComponent('📎 ' + d.title);
  window.open(url, '_blank', 'noopener');
}

// ---------------------------------------------------
// 📲 แชร์ไฟล์เดี่ยว (QR + ลิงก์ + LINE)
// ---------------------------------------------------
function openFileShare(docId) {
  const d = appState.documents.find(x => x.id === docId);
  if(!d) return;
  window._fileShareTarget = d;

  document.getElementById('fileShareTitle').innerText = d.title;
  document.getElementById('fileShareLinkInput').value = d.fileUrl;
  document.getElementById('fileShareLineBtn').href = 'https://social-plugins.line.me/lineit/share?url=' + encodeURIComponent(d.fileUrl) + '&text=' + encodeURIComponent('📎 ' + d.title);

  const qrBox = document.getElementById('fileShareQrBox');
  qrBox.innerHTML = '';
  if(typeof QRCode !== 'undefined') {
    new QRCode(qrBox, { text: d.fileUrl, width: 170, height: 170, correctLevel: QRCode.CorrectLevel.M });
  } else {
    qrBox.innerHTML = '<p class="text-xs text-slate-400 py-8">โหลดตัวสร้าง QR ไม่สำเร็จ — ใช้ปุ่มคัดลอกลิงก์ด้านล่างแทนได้</p>';
  }

  document.getElementById('fileShareModal').classList.remove('hidden');
}

function closeFileShare() {
  document.getElementById('fileShareModal').classList.add('hidden');
}

function copyFileShareLink() {
  const input = document.getElementById('fileShareLinkInput');
  input.select();
  const done = () => Swal.fire({ icon: 'success', title: 'คัดลอกลิงก์แล้ว', timer: 1400, showConfirmButton: false });
  if(navigator.clipboard) navigator.clipboard.writeText(input.value).then(done).catch(() => { document.execCommand('copy'); done(); });
  else { document.execCommand('copy'); done(); }
}

// ไฟล์ยอดนิยม
function renderPopular() {
  const sec = document.getElementById('popularSection');
  const list = document.getElementById('popularList');
  if(!sec || !list) return;
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  const top = [...appState.documents].filter(d => (d.views || 0) > 0).sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
  if(top.length === 0) { sec.classList.add('hidden'); return; }
  sec.classList.remove('hidden');
  list.innerHTML = top.map((d, i) => `
    <div onclick="openIframeModal('${d.fileUrl}', '${d.title}', '${d.id}')" class="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-lg hover:border-orange-300 transition cursor-pointer hover:-translate-y-1">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xl">${medals[i] || '📄'}</span>
        <span class="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full"><i class="fa-solid fa-eye mr-1"></i>${d.views || 0}</span>
      </div>
      <p class="font-bold text-slate-700 text-xs leading-snug line-clamp-2" title="${d.title}">${d.title}</p>
      <p class="text-[10px] text-slate-400 mt-1.5 truncate">${d.uploader} · ${d.category || ''}</p>
    </div>
  `).join('');
}

function filterStudyData() {
  const subj = document.getElementById('studySubjectFilter').value;
  const type = document.getElementById('studyTypeFilter').value;
  
  const docs = appState.documents.filter(d => {
    const matchSubj = subj ? d.category.toLowerCase() === subj.toLowerCase() : true;
    const matchType = type ? d.docType === type : true;
    return matchSubj && matchType;
  });
  
  const tb = document.getElementById('studyDocTableBody');
  if(docs.length === 0) {
    tb.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-slate-400 text-xs font-medium">ไม่พบเอกสารประกอบการสอบ</td></tr>`;
  } else {
    tb.innerHTML = docs.map(d => `
      <tr class="hover:bg-slate-50 border-b transition">
        <td class="py-3 px-2 font-medium text-slate-700 truncate max-w-[150px]" title="${d.title}">${d.title}</td>
        <td class="py-3 px-2"><span class="bg-pink-50 text-pink-600 border border-pink-100 px-2 py-0.5 rounded-md text-[10px] font-bold">${d.docType}</span></td>
        <td class="py-3 px-2 text-slate-500 text-xs">${d.uploader}</td>
        <td class="py-3 px-2 text-right">
          <button onclick="openIframeModal('${d.fileUrl}', '${d.title}')" class="text-slate-400 hover:text-pink-600 transition"><i class="fa-solid fa-circle-play text-lg"></i></button>
        </td>
      </tr>
    `).join('');
  }
  
  // อัปเดตแฟลชการ์ดและรายการสิ่งที่ต้องทำตามวิชาที่เลือกด้วย
  renderFlashcards();
  renderTasks();
}

let currentFcIndex = 0;
let currentFcArray = [];

function renderFlashcards() {
  const subj = document.getElementById('studySubjectFilter').value;
  const grid = document.getElementById('flashcardGrid');
  
  if (!subj) {
    grid.innerHTML = `<div class="col-span-full py-12 flex flex-col items-center text-slate-400">
      <i class="fa-solid fa-layer-group text-4xl mb-3 text-slate-300"></i>
      <p class="text-sm font-medium">โปรดเลือกวิชาด้านบนเพื่อเริ่มทบทวนแฟลชการ์ด</p>
    </div>`;
    return;
  }
  
  currentFcArray = appState.flashcards
    .filter(f => f.subject.toLowerCase() === subj.toLowerCase())
    .sort((a, b) => (a.box || 0) - (b.box || 0)); // การ์ดที่ยังไม่แม่นโผล่ก่อน
  
  if(currentFcArray.length === 0) {
    grid.innerHTML = `<div class="col-span-full py-12 text-center text-slate-400 text-xs font-medium border-2 border-dashed border-slate-200 rounded-2xl w-full">ยังไม่มีแฟลชการ์ดในวิชา ${subj}</div>`;
    return;
  }
  
  // Render a "Deck" cover
  grid.innerHTML = `
    <div class="bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg flex flex-col items-center justify-center text-center cursor-pointer hover:scale-[1.02] transition transform h-48 w-full max-w-sm mx-auto group" onclick="openFcViewer()">
      <div class="w-16 h-16 bg-white/20 rounded-full flex justify-center items-center mb-3 group-hover:scale-110 transition">
        <i class="fa-solid fa-play text-2xl ml-1"></i>
      </div>
      <h3 class="text-xl font-bold">ทบทวนวิชา ${subj}</h3>
      <p class="text-fuchsia-100 text-sm mt-1">มีทั้งหมด ${currentFcArray.length} การ์ด</p>
    </div>
  `;
}

function openFcViewer() {
  if (currentFcArray.length === 0) return;
  currentFcIndex = 0;
  
  document.getElementById('fcViewerModal').classList.remove('hidden');
  renderCurrentFc();
}

function closeFcViewer() {
  document.getElementById('fcViewerModal').classList.add('hidden');
}

function prevFc() {
  if (currentFcIndex > 0) {
    currentFcIndex--;
    renderCurrentFc();
  }
}

function nextFc() {
  if (currentFcIndex < currentFcArray.length - 1) {
    currentFcIndex++;
    renderCurrentFc();
  }
}

function reviewCard(id, remembered) {
  const f = appState.flashcards.find(x => x.id === id);
  if(f) f.box = remembered ? Math.min((f.box || 0) + 1, 5) : 0;
  fetch(API_URL + `?action=reviewFlashcard&id=${encodeURIComponent(id)}&remembered=${remembered}`).catch(() => {});
  if(currentFcIndex < currentFcArray.length - 1) {
    nextFc();
  } else {
    // การ์ดสุดท้าย — กลับไปเริ่มชุดใหม่ที่จัดเรียงความแม่นใหม่
    currentFcArray.sort((a, b) => (a.box || 0) - (b.box || 0));
    currentFcIndex = 0;
    renderCurrentFc();
  }
}

function renderCurrentFc() {
  const f = currentFcArray[currentFcIndex];
  
  document.getElementById('fcPrevBtn').disabled = currentFcIndex === 0;
  document.getElementById('fcNextBtn').disabled = currentFcIndex === currentFcArray.length - 1;
  document.getElementById('fcViewerCounter').innerText = `${currentFcIndex + 1} / ${currentFcArray.length}`;
  
  let imgUrl = f.image;
  if (imgUrl && imgUrl !== '-' && imgUrl.includes('drive.google.com/file/d/')) {
    const match = imgUrl.match(/[-\w]{25,}/);
    if (match) imgUrl = `https://drive.google.com/thumbnail?id=${match[0]}&sz=w800`;
  }
  let imgTag = imgUrl && imgUrl !== '-' ? `<img src="${imgUrl}" class="mt-6 w-full max-h-48 object-contain rounded-lg shadow-sm" alt="ภาพประกอบ" loading="lazy">` : '';
  
  let delBtn = (appState.username === f.username || appState.role === 'admin') 
      ? `<button onclick="deleteFlashcard('${f.id}', event); closeFcViewer();" class="absolute top-4 right-4 w-10 h-10 bg-red-500/90 text-white shadow-md rounded-full flex items-center justify-center hover:bg-red-600 hover:scale-110 transition z-20"><i class="fa-solid fa-trash-can text-sm"></i></button>` 
      : '';
  
  const container = document.getElementById('fcViewerCardContainer');
  
  container.innerHTML = `
    <div class="h-full relative cursor-pointer group" onclick="this.querySelector('.flashcard-inner').classList.toggle('flashcard-flipped')">
      <div class="flashcard-inner w-full h-full relative duration-500">
        
        <!-- Front -->
        <div class="flashcard-front absolute w-full h-full bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-2xl p-6 sm:p-10 text-white flex flex-col justify-center items-center text-center shadow-2xl border-4 border-white/10">
          ${delBtn}
          <h4 class="font-bold text-2xl sm:text-4xl leading-relaxed">${f.question}</h4>
          <p class="text-sm text-fuchsia-200 absolute bottom-6"><i class="fa-solid fa-hand-pointer mr-2"></i> แตะเพื่อดูคำตอบ</p>
        </div>
        
        <!-- Back -->
        <div class="flashcard-back absolute w-full h-full bg-white border-4 border-fuchsia-100 rounded-2xl p-6 sm:p-10 flex flex-col justify-center items-center text-center shadow-2xl overflow-hidden">
          <p class="text-[10px] font-bold text-fuchsia-400 tracking-widest uppercase mb-2">ระดับความแม่น ${'●'.repeat(f.box || 0)}${'○'.repeat(5 - (f.box || 0))}</p>
          <p class="font-medium text-slate-700 text-xl sm:text-2xl overflow-y-auto w-full">${f.answer}</p>
          ${imgTag}
          <div class="flex gap-3 mt-6" onclick="event.stopPropagation()">
            <button onclick="reviewCard('${f.id}', true)" class="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-md transition"><i class="fa-regular fa-face-smile-beam mr-1"></i> จำได้!</button>
            <button onclick="reviewCard('${f.id}', false)" class="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm rounded-xl shadow-md transition"><i class="fa-regular fa-face-dizzy mr-1"></i> ยังไม่แม่น</button>
          </div>
          <p class="text-xs text-slate-400 absolute bottom-3"><i class="fa-solid fa-hand-pointer mr-2"></i> แตะกลางการ์ดเพื่อกลับไปคำถาม</p>
        </div>
        
      </div>
    </div>
  `;
}

function renderTasks() {
  const subj = document.getElementById('studySubjectFilter').value;
  const list = document.getElementById('taskList');
  
  let myTasks = appState.tasks.filter(t => t.username === (appState.username || 'guest'));
  if(subj) myTasks = myTasks.filter(t => t.subject.toLowerCase() === subj.toLowerCase());
  
  if(myTasks.length === 0) {
    list.innerHTML = `<p class="text-center text-slate-400 text-xs py-4">ไม่มีรายการที่ต้องทำ</p>`;
    return;
  }
  
  list.innerHTML = myTasks.map(t => `
    <div class="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-purple-200 transition">
      <button onclick="toggleTask('${t.id}', ${t.isDone})" class="mt-0.5 text-lg ${t.isDone ? 'text-emerald-500' : 'text-slate-300 hover:text-purple-400'} transition">
        <i class="fa-regular ${t.isDone ? 'fa-circle-check' : 'fa-circle'}"></i>
      </button>
      <div>
        <p class="text-sm font-medium ${t.isDone ? 'text-slate-400 line-through' : 'text-slate-700'}">${t.detail}</p>
        <span class="text-[9px] font-bold text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded">${t.subject}</span>
      </div>
    </div>
  `).join('');
}

// ---------------------------------------------------
// Upload Logic
// ---------------------------------------------------
function setupUploadMode() {
  document.getElementById('sectionFileUpload').classList.remove('hidden');
  document.getElementById('sectionLinkUpload').classList.add('hidden');
}

function toggleUploadMode(mode) {
  appState.currentMode = mode;
  if(mode === 'file') {
    document.getElementById('sectionFileUpload').classList.remove('hidden');
    document.getElementById('sectionLinkUpload').classList.add('hidden');
    document.getElementById('tabFileBtn').classList.replace('text-slate-500', 'text-blue-600');
    document.getElementById('tabFileBtn').classList.replace('bg-transparent', 'bg-white');
    document.getElementById('tabFileBtn').classList.add('shadow-sm');
    document.getElementById('tabLinkBtn').classList.replace('text-blue-600', 'text-slate-500');
    document.getElementById('tabLinkBtn').classList.replace('bg-white', 'bg-transparent');
    document.getElementById('tabLinkBtn').classList.remove('shadow-sm');
  } else {
    document.getElementById('sectionLinkUpload').classList.remove('hidden');
    document.getElementById('sectionFileUpload').classList.add('hidden');
    document.getElementById('tabLinkBtn').classList.replace('text-slate-500', 'text-blue-600');
    document.getElementById('tabLinkBtn').classList.replace('bg-transparent', 'bg-white');
    document.getElementById('tabLinkBtn').classList.add('shadow-sm');
    document.getElementById('tabFileBtn').classList.replace('text-blue-600', 'text-slate-500');
    document.getElementById('tabFileBtn').classList.replace('bg-white', 'bg-transparent');
    document.getElementById('tabFileBtn').classList.remove('shadow-sm');
  }
}

function handleFileSelect(e) {
  appState.selectedFiles = Array.from(e.target.files);
  const container = document.getElementById('fileQueueContainer');
  const list = document.getElementById('fileQueueList');
  if(appState.selectedFiles.length > 0) {
    container.classList.remove('hidden');
    list.innerHTML = appState.selectedFiles.map(f => `<div class="text-xs bg-white p-2 rounded border border-slate-100 flex justify-between"><span class="truncate">${f.name}</span><span class="text-slate-400">${(f.size/1024/1024).toFixed(2)} MB</span></div>`).join('');
    
    const firstFile = appState.selectedFiles[0].name;
    const titleWithoutExt = firstFile.substring(0, firstFile.lastIndexOf('.')) || firstFile;
    const docTitleInput = document.getElementById('docTitleName');
    if (docTitleInput && !docTitleInput.value) {
      docTitleInput.value = titleWithoutExt;
    }
  } else {
    container.classList.add('hidden');
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('docTitleName').value;
  const uploader = document.getElementById('uploaderName').value;
  const folderId = document.getElementById('docFolderSelect').value;
  const cat = document.getElementById('docCategorySelect').value;
  const docType = document.getElementById('docTypeSelect').value;

  if(!folderId) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกโฟลเดอร์ก่อนอัปโหลด (สร้างโฟลเดอร์ได้ที่แท็บคลังโฟลเดอร์)', 'warning');

  if(appState.currentMode === 'link') {
    const url = document.getElementById('docLinkUrl').value;
    Swal.fire({ title: 'กำลังอัปโหลด...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const formUrl = API_URL + `?action=uploadDocumentByLink&docTitle=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}&category=${encodeURIComponent(cat)}&folderId=${encodeURIComponent(folderId)}&uploader=${encodeURIComponent(uploader)}&docType=${encodeURIComponent(docType)}`;
    fetch(formUrl).then(() => {
      Swal.fire('สำเร็จ!', 'เพิ่มเอกสารจากลิงก์เรียบร้อย', 'success');
      document.getElementById('uploadForm').reset();
      refreshData(true);
    }).catch(() => Swal.fire('สำเร็จ', 'ส่งคำสั่งเรียบร้อย (ไม่สามารถอ่านสถานะได้)', 'success'));

  } else {
    if(appState.selectedFiles.length === 0) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกไฟล์ก่อนอัปโหลด', 'warning');

    Swal.fire({ title: 'กำลังอัปโหลดไฟล์...', text: 'กรุณารอสักครู่ (ห้ามปิดหน้าต่าง)', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    let successCount = 0;
    for(let file of appState.selectedFiles) {
      const base64 = await new Promise(r => {
        const reader = new FileReader();
        reader.onload = () => r(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
      });

      const payload = {
        action: 'uploadFileToDrive',
        base64Data: base64, filename: file.name, mimeType: file.type,
        category: cat, folderId: folderId, uploader: uploader, docTitle: title, docType: docType
      };

      await fetch(API_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      successCount++;
    }

    Swal.fire('สำเร็จ!', `อัปโหลด ${successCount} ไฟล์เรียบร้อย`, 'success');
    document.getElementById('uploadForm').reset();
    appState.selectedFiles = [];
    document.getElementById('fileQueueContainer').classList.add('hidden');
    // รอให้ Apps Script เขียนแถวลงชีตก่อน แล้วอ่านข้อมูลจากเซิร์ฟเวอร์ใหม่โดยไม่ใช้แคช
    setTimeout(() => refreshData(true), 1200);
  }
}

// ---------------------------------------------------
// Task & Flashcard Logic
// ---------------------------------------------------
function handleAddTask() {
  const detail = document.getElementById('newTaskDetail').value;
  const subj = document.getElementById('studySubjectFilter').value;
  if(!detail) return;
  if(!subj) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกวิชาจากด้านบนก่อนเพิ่ม To-Do', 'warning');
  
  const user = appState.username || 'guest';
  fetch(API_URL + `?action=addChecklistTask&username=${encodeURIComponent(user)}&subject=${encodeURIComponent(subj)}&detail=${encodeURIComponent(detail)}`).then(() => {
    document.getElementById('newTaskDetail').value = '';
    refreshData();
  });
}

function toggleTask(id, currentStatus) {
  fetch(API_URL + `?action=toggleChecklistTask&id=${id}&currentStatus=${currentStatus}`).then(() => refreshData());
}

function openFlashcardModal() {
  document.getElementById('flashcardModal').classList.remove('hidden');
  setTimeout(() => {
    document.getElementById('fcModalContent').classList.remove('scale-95', 'opacity-0');
  }, 10);
}

function closeFlashcardModal() {
  const content = document.getElementById('fcModalContent');
  content.classList.add('scale-95', 'opacity-0');
  setTimeout(() => {
    document.getElementById('flashcardModal').classList.add('hidden');
    document.getElementById('fcQuestion').value = '';
    document.getElementById('fcAnswer').value = '';
    document.getElementById('fcImage').value = '';
  }, 300);
}

async function submitFlashcard() {
  const s = document.getElementById('fcSubject').value;
  const q = document.getElementById('fcQuestion').value;
  const a = document.getElementById('fcAnswer').value;
  const fileInput = document.getElementById('fcImage');
  if(!s) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกวิชาของแฟลชการ์ด (ถ้ายังไม่มีวิชา กดปุ่ม ⚙️ เพื่อสร้างก่อน)', 'warning');
  if(!q || !a) return Swal.fire('แจ้งเตือน', 'กรุณากรอกคำถามและคำตอบ', 'warning');

  const btn = document.getElementById('fcSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';

  let base64 = "", name = "", mime = "";
  if(fileInput.files.length > 0) {
    const file = fileInput.files[0];
    name = file.name; mime = file.type;
    base64 = await new Promise(r => {
      const reader = new FileReader();
      reader.onload = () => r(reader.result.split(',')[1]);
      reader.readAsDataURL(file);
    });
  }

  const done = () => {
    closeFlashcardModal();
    btn.disabled = false;
    btn.innerHTML = 'บันทึกแฟลชการ์ด';
  };

  if(!base64) {
    // ไม่มีรูป → ส่งแบบ GET เพื่ออ่านผลจริงจากเซิร์ฟเวอร์ได้
    const url = API_URL + `?action=addFlashcardItem&username=${encodeURIComponent(appState.username || 'guest')}&subject=${encodeURIComponent(s)}&question=${encodeURIComponent(q)}&answer=${encodeURIComponent(a)}`;
    fetchWithTimeout(url, 15000).then(r => r.json()).then(res => {
      done();
      if(res.success) {
        Swal.fire('สำเร็จ', 'สร้างแฟลชการ์ดเรียบร้อย', 'success');
        refreshData(true);
      } else {
        Swal.fire('บันทึกไม่สำเร็จ', res.message || 'เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์ ลองอีกครั้ง', 'error');
      }
    }).catch(() => {
      done();
      setTimeout(() => refreshData(true), 1500);
    });
  } else {
    // มีรูป → POST แบบเดิม (backend จะบันทึกการ์ดก่อนเสมอแม้รูปจะพัง)
    const payload = {
      action: 'addFlashcardItem', username: appState.username || 'guest',
      subject: s, question: q, answer: a,
      imageBase64: base64, imageName: name, imageMime: mime
    };
    fetch(API_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(() => {
      done();
      Swal.fire('สำเร็จ', 'สร้างแฟลชการ์ดเรียบร้อย', 'success');
      setTimeout(() => refreshData(true), 1500);
    });
  }
}

function deleteFlashcard(id, event) {
  event.stopPropagation();
  Swal.fire({
    title: 'ยืนยันการลบ?',
    text: "ลบแล้วไม่สามารถกู้คืนได้!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    confirmButtonText: 'ลบทิ้ง'
  }).then((result) => {
    if (result.isConfirmed) {
      fetch(API_URL + `?action=deleteFlashcard&id=${id}&username=${appState.username || 'admin'}`).then(() => {
        Swal.fire('ลบสำเร็จ!', '', 'success');
        refreshData();
      });
    }
  });
}

// ---------------------------------------------------
// UI Navigation
// ---------------------------------------------------
function switchTab(tabId) {
  appState.currentTab = tabId;
  ['tabMain', 'tabFolders', 'tabStudy', 'tabDashboard'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
    document.getElementById('btn' + id.charAt(0).toUpperCase() + id.slice(1)).classList.replace('text-blue-600', 'text-slate-500');
    document.getElementById('btn' + id.charAt(0).toUpperCase() + id.slice(1)).classList.replace('bg-white', 'bg-transparent');
  });

  // แถบนำทางล่าง (มือถือ)
  const bnavMap = { tabMain: 'bnavMain', tabFolders: 'bnavFolders', tabStudy: 'bnavStudy', tabDashboard: 'bnavDashboard' };
  Object.values(bnavMap).forEach(id => {
    const el = document.getElementById(id);
    if(el) { el.classList.remove('text-blue-600'); el.classList.add('text-slate-400'); }
  });
  const activeBnav = document.getElementById(bnavMap[tabId]);
  if(activeBnav) { activeBnav.classList.add('text-blue-600'); activeBnav.classList.remove('text-slate-400'); }

  document.getElementById(tabId).classList.remove('hidden');

  const activeBtn = document.getElementById('btn' + tabId.charAt(0).toUpperCase() + tabId.slice(1));
  activeBtn.classList.replace('text-slate-500', 'text-blue-600');
  activeBtn.classList.replace('bg-transparent', 'bg-white');
}

// ---------------------------------------------------
// Admin & Auth
// ---------------------------------------------------
function toggleAdminView() {
  if(appState.username) {
    appState.username = '';
    appState.role = '';
    document.getElementById('adminBtnText').innerText = 'เข้าสู่ระบบ';
    document.getElementById('userNameDisplay').innerText = 'ผู้ใช้งานทั่วไป';
    document.getElementById('btnTabDashboard').classList.add('hidden');
    const bd = document.getElementById('bnavDashboard');
    if(bd) { bd.classList.add('hidden'); bd.classList.remove('flex'); }
    if(appState.currentTab === 'tabDashboard') switchTab('tabMain');
    refreshData();
  } else {
    document.getElementById('loginModal').classList.remove('hidden');
    setTimeout(() => {
      document.getElementById('loginModalContent').classList.remove('scale-95', 'opacity-0');
    }, 10);
  }
}

function closeLoginModal() {
  const content = document.getElementById('loginModalContent');
  content.classList.add('scale-95', 'opacity-0');
  setTimeout(() => {
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    const p2 = document.getElementById('loginPassword2');
    if(p2) p2.value = '';
    showLoginForm();
  }, 300);
}

function showRegisterForm() {
  window._loginMode = 'register';
  document.getElementById('loginModalTitle').innerText = 'สมัครสมาชิกใหม่';
  document.getElementById('loginModalSubtitle').innerText = 'สร้างบัญชีของคุณเอง — To-Do และความคืบหน้าจะเป็นของคุณ';
  document.getElementById('confirmPassGroup').classList.remove('hidden');
  document.getElementById('loginSubmitBtn').innerHTML = 'สมัครสมาชิก <i class="fa-solid fa-user-plus"></i>';
  document.getElementById('switchToRegister').classList.add('hidden');
  document.getElementById('switchToLogin').classList.remove('hidden');
}

function showLoginForm() {
  window._loginMode = 'login';
  document.getElementById('loginModalTitle').innerText = 'เข้าสู่ระบบจัดการ';
  document.getElementById('loginModalSubtitle').innerText = 'เฉพาะผู้ดูแลระบบหรือผู้ใช้ที่ได้รับอนุญาต';
  document.getElementById('confirmPassGroup').classList.add('hidden');
  document.getElementById('loginSubmitBtn').innerHTML = 'เข้าสู่ระบบ <i class="fa-solid fa-arrow-right-to-bracket"></i>';
  document.getElementById('switchToRegister').classList.remove('hidden');
  document.getElementById('switchToLogin').classList.add('hidden');
}

function applyLoginSuccess(res) {
  closeLoginModal();
  appState.username = res.username;
  appState.role = res.role;
  document.getElementById('adminBtnText').innerText = 'ออกระบบ';
  document.getElementById('userNameDisplay').innerText = res.username;

  if(res.role === 'admin') {
    document.getElementById('btnTabDashboard').classList.remove('hidden');
    const bd = document.getElementById('bnavDashboard');
    if(bd) bd.classList.remove('hidden');
    bd && bd.classList.add('flex');
  }

  Swal.fire({ icon: 'success', title: 'ยินดีต้อนรับ!', text: `สวัสดีคุณ ${res.username}`, timer: 1600, showConfirmButton: false });
  refreshData(true);
}

function submitLogin() {
  const u = document.getElementById('loginUsername').value;
  const p = document.getElementById('loginPassword').value;
  if(!u || !p) return;

  const btn = document.getElementById('loginSubmitBtn');

  if(window._loginMode === 'register') {
    const p2 = document.getElementById('loginPassword2').value;
    if(p !== p2) return Swal.fire('รหัสไม่ตรงกัน', 'กรอกรหัสผ่านยืนยันให้เหมือนกัน', 'warning');

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    fetchWithTimeout(API_URL + `?action=registerUser&username=${encodeURIComponent(u)}&password=${encodeURIComponent(p)}`, 15000)
      .then(r => r.json())
      .then(res => {
        btn.innerHTML = 'สมัครสมาชิก <i class="fa-solid fa-user-plus"></i>';
        if(res.success) applyLoginSuccess(res);
        else Swal.fire('สมัครไม่สำเร็จ', res.message, 'error');
      }).catch(() => {
        btn.innerHTML = 'สมัครสมาชิก <i class="fa-solid fa-user-plus"></i>';
        Swal.fire('เชื่อมต่อไม่ได้', 'ลองอีกครั้ง', 'warning');
      });
    return;
  }

  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

  fetchWithTimeout(API_URL + `?action=verifyLogin&username=${encodeURIComponent(u)}&password=${encodeURIComponent(p)}`, 10000)
    .then(r => r.json())
    .then(res => {
      btn.innerHTML = 'เข้าสู่ระบบ <i class="fa-solid fa-arrow-right-to-bracket"></i>';
      if(res.success) {
        applyLoginSuccess(res);
      } else {
        Swal.fire('ข้อมูลไม่ถูกต้อง', res.message, 'error');
      }
    });
}

function updateDashboardStats() {
  document.getElementById('statTotalDocs').innerText = appState.documents.length;
  document.getElementById('statTotalFC').innerText = appState.flashcards.length;
  document.getElementById('statTotalSubj').innerText = appState.categories.length;
  document.getElementById('statTotalTasks').innerText = appState.tasks.length;
  document.getElementById('statTotalFolders').innerText = appState.folders.length;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  document.getElementById('statWeekUploads').innerText = appState.documents.filter(d => {
    const t = new Date(d.uploadDate).getTime();
    return !isNaN(t) && t >= weekAgo;
  }).length;
  document.getElementById('statContributors').innerText = new Set(appState.documents.map(d => d.uploader)).size;
  renderDashboardCharts();
  renderRecentUploads();
  fetchLogs();
  fetchDriveUsage();
}

// ---------- กราฟมืออาชีพด้วย Chart.js ----------
window._charts = window._charts || {};

function makeChart(id, config) {
  const el = document.getElementById(id);
  if(!el || typeof Chart === 'undefined') return;
  if(window._charts[id]) window._charts[id].destroy();
  window._charts[id] = new Chart(el, config);
}

function renderDashboardCharts() {
  const FONT = "'Prompt', sans-serif";
  if(typeof Chart !== 'undefined') Chart.defaults.font.family = FONT;

  // 1) แท่งแนวนอน: เอกสารแยกตามวิชา/โฟลเดอร์ (10 อันดับ)
  const subjectCounts = {};
  appState.documents.forEach(doc => { const key = doc.category || 'ทั่วไป'; subjectCounts[key] = (subjectCounts[key] || 0) + 1; });
  const subjEntries = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  makeChart('chartSubjects', {
    type: 'bar',
    data: {
      labels: subjEntries.map(e => e[0]),
      datasets: [{ data: subjEntries.map(e => e[1]), backgroundColor: 'rgba(99,102,241,.85)', hoverBackgroundColor: '#4f46e5', borderRadius: 8, borderSkipped: false }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { color: '#f1f5f9' }, ticks: { precision: 0 } }, y: { grid: { display: false } } }
    }
  });

  // 2) โดนัท: สัดส่วนประเภทเนื้อหา
  const typeCounts = {};
  appState.documents.forEach(doc => { const key = doc.docType || 'ทั่วไป'; typeCounts[key] = (typeCounts[key] || 0) + 1; });
  const typeColors = ['#6366f1', '#d946ef', '#f59e0b', '#10b981', '#38bdf8', '#f43f5e', '#a8a29e'];
  makeChart('chartTypes', {
    type: 'doughnut',
    data: {
      labels: Object.keys(typeCounts),
      datasets: [{ data: Object.values(typeCounts), backgroundColor: typeColors, borderWidth: 3, borderColor: '#ffffff', hoverOffset: 10 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%',
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 14, font: { family: FONT, weight: '600' } } } }
    }
  });

  // 3) เส้นพื้นที่: อัปโหลด 14 วันล่าสุด
  const days = [], counts = [];
  for(let i = 13; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    days.push(d); counts.push(0);
  }
  appState.documents.forEach(doc => {
    const t = new Date(doc.uploadDate);
    if(isNaN(t)) return;
    t.setHours(0, 0, 0, 0);
    const idx = days.findIndex(x => x.getTime() === t.getTime());
    if(idx > -1) counts[idx]++;
  });
  makeChart('chartTimeline', {
    type: 'line',
    data: {
      labels: days.map(d => d.getDate() + '/' + (d.getMonth() + 1)),
      datasets: [{ data: counts, borderColor: '#059669', backgroundColor: 'rgba(5,150,105,.12)', fill: true, tension: .4, pointBackgroundColor: '#059669', pointRadius: 4, borderWidth: 3 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
    }
  });
}

// ---------- อัปโหลดล่าสุด ----------
function renderRecentUploads() {
  const el = document.getElementById('recentUploads');
  if(!el) return;
  const recent = appState.documents.slice(0, 6);
  if(recent.length === 0) {
    el.innerHTML = '<p class="text-slate-400 text-center py-4">ยังไม่มีการอัปโหลด</p>';
    return;
  }
  el.innerHTML = recent.map(d => `
    <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
      <div class="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0"><i class="fa-solid fa-file-arrow-up"></i></div>
      <div class="min-w-0 flex-1">
        <p class="font-bold text-slate-700 truncate">${d.title}</p>
        <p class="text-[11px] text-slate-400 truncate">${d.uploader} · ${d.category || '-'}</p>
      </div>
      <span class="text-[10px] text-slate-400 whitespace-nowrap shrink-0">${formatShortDate(d.uploadDate)}</span>
    </div>`).join('');
}

function formatShortDate(s) {
  const d = new Date(s);
  if(isNaN(d)) return '';
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

// ---------- พื้นที่ Drive ที่ใช้ไป ----------
function fetchDriveUsage() {
  fetchWithTimeout(API_URL + "?action=getDriveUsage", 30000).then(r => r.json()).then(res => {
    if(!res.success) return;
    const mb = res.bytes / 1024 / 1024;
    document.getElementById('statDriveUsage').innerText = mb >= 1024 ? (mb / 1024).toFixed(1) + ' GB' : mb.toFixed(1) + ' MB';
  }).catch(() => {});
}

function fetchLogs() {
  fetchWithTimeout(API_URL + "?action=getSystemLogs", 10000).then(r => r.json()).then(logs => {
    const feed = document.getElementById('activityFeedAdmin');
    if(!logs || logs.length === 0) {
      feed.innerHTML = '<p class="text-slate-400 text-center">ไม่มีประวัติการใช้งาน</p>';
      return;
    }
    feed.innerHTML = logs.map(l => `
      <div class="flex gap-3 py-2 border-b border-slate-200 last:border-0">
        <span class="text-[10px] text-slate-400 font-mono whitespace-nowrap mt-1">${l.timestamp}</span>
        <span class="text-slate-700">${l.details}</span>
      </div>
    `).join('');
  }).catch(() => {
    const feed = document.getElementById('activityFeedAdmin');
    if (feed && !feed.dataset.loaded) feed.innerHTML = '<p class="text-slate-400 text-center">โหลดประวัติไม่สำเร็จ</p>';
  });
}

function handleAddSubject() {
  const name = document.getElementById('newSubjectName').value;
  if(!name) return;
  fetch(API_URL + `?action=addNewCategory&subjectName=${encodeURIComponent(name)}&username=${appState.username}`).then(() => {
    document.getElementById('newSubjectName').value = '';
    refreshData();
  });
}

function saveSettings() {
  const t = document.getElementById('settingBannerTitle').value;
  const s = document.getElementById('settingBannerSubtitle').value;
  const btn = document.getElementById('saveSettingsBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';
  
  const payload = {
    action: 'updateSettings',
    username: appState.username || 'admin',
    settings: {
      bannerTitle: t, bannerSubtitle: s,
      primaryColor: document.getElementById('settingPrimaryColor').value,
      accentColor: document.getElementById('settingAccentColor').value,
      backgroundColor: document.getElementById('settingBackgroundColor').value,
      bannerButtonText: document.getElementById('settingBannerButtonText').value,
      showBanner: document.getElementById('settingShowBanner').checked ? 'true' : 'false',
      siteIcon: document.getElementById('settingSiteIcon').value,
      siteFont: document.getElementById('settingSiteFont').value,
      cornerStyle: document.getElementById('settingCornerStyle').value,
      animationsEnabled: document.getElementById('settingAnimations').checked ? 'true' : 'false',
      footerText: document.getElementById('settingFooterText').value
    }
  };
  
  fetch(API_URL, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(() => {
    btn.disabled = false;
    btn.innerHTML = 'บันทึกการตั้งค่า';
    Swal.fire('สำเร็จ', 'บันทึกการตั้งค่าหน้าเว็บเรียบร้อย', 'success');
    refreshData();
  });
}

function applySiteSettings(settings) {
  document.documentElement.style.setProperty('--site-primary', settings.primary_color || '#2563eb');
  document.documentElement.style.setProperty('--site-accent', settings.accent_color || '#9333ea');
  document.documentElement.style.setProperty('--ui-primary', settings.primary_color || '#2563eb');
  document.documentElement.style.setProperty('--ui-accent', settings.accent_color || '#9333ea');
  document.body.style.backgroundColor = settings.background_color || '#f8fafc';
  if(settings.site_font) document.body.style.fontFamily = `'${settings.site_font}', 'Prompt', sans-serif`;
  document.body.classList.toggle('style-square', settings.corner_style === 'square');
  document.body.classList.toggle('no-anim', settings.animations_enabled === 'false');
  const footerEl = document.getElementById('footerTextEl');
  if(footerEl) footerEl.innerText = settings.footer_text || '📚 DOC HUB — ระบบคลังเอกสาร';
  const banner = document.getElementById('bannerTitle')?.closest('.bg-white');
  if (banner) {
    banner.style.display = settings.show_banner === 'false' ? 'none' : '';
    const stripe = banner.querySelector('.absolute.top-0');
    if (stripe) stripe.style.background = `linear-gradient(90deg, ${settings.primary_color || '#2563eb'}, ${settings.accent_color || '#9333ea'})`;
  }
  const icon = document.querySelector('#navTitle')?.previousElementSibling?.querySelector('i');
  if (icon && settings.site_icon) {
    icon.className = `fa-solid ${settings.site_icon} text-lg`;
    icon.parentElement.style.background = `linear-gradient(135deg, ${settings.primary_color || '#2563eb'}, ${settings.accent_color || '#9333ea'})`;
  }
}

function applyThemePreset(primary, accent, bg) {
  document.getElementById('settingPrimaryColor').value = primary;
  document.getElementById('settingAccentColor').value = accent;
  document.getElementById('settingBackgroundColor').value = bg;
  Swal.fire({ icon: 'success', title: 'เติมธีมให้แล้ว!', text: 'อย่าลืมกด "บันทึกการตั้งค่า" ด้านล่าง', timer: 1600, showConfirmButton: false });
}

// ---------------------------------------------------
// Iframe Modal Logic
// ---------------------------------------------------
function openIframeModal(url, title, docId) {
  // นับยอดวิว (ถ้าเป็นเอกสารในระบบ)
  if(docId) {
    const d = appState.documents.find(x => x.id === docId);
    if(d) { d.views = (d.views || 0) + 1; renderPopular(); filterDocuments(); }
    fetch(API_URL + `?action=trackView&docId=${docId}`).catch(() => {});
  }
  // เว็บไซต์ภายนอก เช่น AI Studio/ChatGPT มักบล็อกการแสดงผลใน iframe
  // จึงเปิดแท็บใหม่โดยตรงแทน เพื่อไม่ให้ผู้ใช้เห็นหน้าว่างหรือไฟล์เสีย
  if (isExternalPageUrl(url)) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  let finalUrl = url;
  if (url.includes('drive.google.com/file/d/')) {
    finalUrl = url.replace('/view', '/preview');
  }
  
  document.getElementById('iframeModalTitle').innerText = title;
  document.getElementById('iframeModalExternal').href = url;
  
  const iframe = document.getElementById('contentIframe');
  iframe.classList.add('hidden');
  document.getElementById('iframeLoading').classList.remove('hidden');
  iframe.src = finalUrl;
  
  document.getElementById('iframeModal').classList.remove('hidden');
  setTimeout(() => {
    document.getElementById('iframeModalContent').classList.remove('scale-95', 'opacity-0');
  }, 10);
}

function isExternalPageUrl(url) {
  try {
    const parsed = new URL(url, window.location.href);
    const path = parsed.pathname.toLowerCase();
    const isDocumentFile = /\.(pdf|png|jpe?g|gif|webp|svg|mp4|webm|mp3|wav)(\?.*)?$/.test(path);
    const isGoogleDriveFile = parsed.hostname.includes('drive.google.com') && path.includes('/file/d/');
    return !isDocumentFile && !isGoogleDriveFile;
  } catch (error) {
    return true;
  }
}

function closeIframeModal() {
  const content = document.getElementById('iframeModalContent');
  content.classList.add('scale-95', 'opacity-0');
  setTimeout(() => {
    document.getElementById('iframeModal').classList.add('hidden');
    document.getElementById('contentIframe').src = '';
  }, 300);
}

document.addEventListener('keydown', function(e) {
  if (document.getElementById('fcViewerModal') && !document.getElementById('fcViewerModal').classList.contains('hidden')) {
    if (e.key === 'ArrowLeft') prevFc();
    if (e.key === 'ArrowRight') nextFc();
    if (e.key === 'Escape') closeFcViewer();
    if (e.key === ' ' || e.key === 'Enter') {
      const inner = document.querySelector('#fcViewerCardContainer .flashcard-inner');
      if(inner) inner.classList.toggle('flashcard-flipped');
    }
  }
});

// Touch Swipe Support for Mobile/iPad
let touchStartX = 0;
let touchEndX = 0;

const fcContainer = document.getElementById('fcViewerCardContainer');
if (fcContainer) {
  fcContainer.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  });
  
  fcContainer.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    if (touchStartX - touchEndX > 50) {
      nextFc(); // Swipe left -> Next
    } else if (touchEndX - touchStartX > 50) {
      prevFc(); // Swipe right -> Prev
    }
  });
}

// ---------------------------------------------------
// Subject Manager UI (For all users)
// ---------------------------------------------------
function openSubjectManager() {
  document.getElementById('subjectManagerModal').classList.remove('hidden');
  renderSubjectManagerList();
}

function renderSubjectManagerList() {
  const list = document.getElementById('subjectManagerList');
  if (appState.categories.length === 0) {
    list.innerHTML = `<p class="text-xs text-slate-400">ยังไม่มีวิชา</p>`;
    return;
  }
  
  list.innerHTML = appState.categories.filter(c => c.name.trim() !== '').map(c => `
    <div class="flex justify-between items-center bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition">
      <span class="text-sm font-bold text-slate-700">${c.name}</span>
      <button onclick="handleDeleteSubject('${c.name}')" class="w-8 h-8 flex justify-center items-center rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition" title="ลบวิชา"><i class="fa-solid fa-trash-can text-sm"></i></button>
    </div>
  `).join('');
}

function handleAddSubjectUI() {
  const name = document.getElementById('newSubjectNameUI').value;
  if(!name) return;
  
  fetch(API_URL + `?action=addNewCategory&subjectName=${encodeURIComponent(name)}&username=${appState.username || 'guest'}`).then(() => {
    document.getElementById('newSubjectNameUI').value = '';
    refreshData().then(() => renderSubjectManagerList());
  });
}

function handleDeleteSubject(name) {
  if(!confirm(`คุณต้องการลบวิชา "${name}" ใช่หรือไม่?\n\n(วิชานี้จะถูกลบออกจากตัวเลือก แต่เอกสารเดิมจะไม่หายไป)`)) return;

  fetch(API_URL + `?action=deleteCategory&subjectName=${encodeURIComponent(name)}&username=${appState.username || 'guest'}`).then(() => {
    refreshData().then(() => renderSubjectManagerList());
  });
}

// ---------------------------------------------------
// Folder Explorer (คลังโฟลเดอร์) + Share Links
// ---------------------------------------------------
function openFolder(folderId) {
  appState.currentFolderId = folderId || '';
  renderFolderView();
}

function renderFolderView() {
  const grid = document.getElementById('folderGrid');
  const crumbs = document.getElementById('folderBreadcrumb');
  if(!grid || !crumbs) return;

  const cur = appState.currentFolderId;
  const isNone = cur === '__none__';

  // Breadcrumb: หน้าแรก > ปี 1 > คณิต...
  let chain = [];
  let c = appState.folders.find(f => f.id === cur);
  let guard = 0;
  while(c && guard < 20) { chain.unshift(c); c = appState.folders.find(f => f.id === c.parentId); guard++; }

  if(isNone) {
    crumbs.innerHTML = `<span class="text-slate-800"><i class="fa-solid fa-inbox mr-2 text-teal-500"></i>ยังไม่ได้จัดโฟลเดอร์</span>`;
  } else {
    crumbs.innerHTML = `<button onclick="openFolder('')" class="px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition"><i class="fa-solid fa-house mr-1"></i>หน้าแรก</button>` +
      chain.map((f, i) => {
        const isLast = i === chain.length - 1;
        return `<i class="fa-solid fa-chevron-right text-slate-300 text-xs"></i>` +
          (isLast ? `<span class="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg">${f.name}</span>`
                  : `<button onclick="openFolder('${f.id}')" class="px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition">${f.name}</button>`);
      }).join('');
  }

  // การ์ดโฟลเดอร์ย่อย
  const children = appState.folders.filter(f => (f.parentId || '') === (cur || ''));
  const docsInFolder = isNone
    ? appState.documents.filter(d => !d.folderId)
    : (cur ? appState.documents.filter(d => (d.folderId || '') === cur) : appState.documents);
  const childCount = id => appState.folders.filter(f => (f.parentId || '') === id).length;

  let cards = children.map(f => {
    const fileCount = appState.documents.filter(d => (d.folderId || '') === f.id).length;
    const hasChild = childCount(f.id) > 0;
    const shareBadge = f.shareEnabled ? `<span class="absolute top-3 right-3 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow" title="เปิดแชร์อยู่"><i class="fa-solid fa-share-nodes text-[10px]"></i></span>` : '';
    return `
      <div onclick="openFolder('${f.id}')" class="group relative bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg hover:border-teal-300 transition cursor-pointer hover:-translate-y-1">
        ${shareBadge}
        <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition ${hasChild ? 'bg-teal-100 text-teal-600' : 'bg-amber-100 text-amber-600'}">
          <i class="fa-solid ${hasChild ? 'fa-folder-tree' : 'fa-folder'} text-xl"></i>
        </div>
        <p class="font-bold text-slate-800 text-sm truncate" title="${f.name}">${f.name}</p>
        <p class="text-[11px] text-slate-400 mt-1">${fileCount} ไฟล์${hasChild ? ` · ${childCount(f.id)} โฟลเดอร์ย่อย` : ''}</p>
        <div class="mt-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition" onclick="event.stopPropagation()">
          <button onclick="openShareModal('${f.id}')" class="flex-1 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-[11px] font-bold transition"><i class="fa-solid fa-share-nodes mr-1"></i>แชร์</button>
          <button onclick="handleDeleteFolder('${f.id}')" class="px-2.5 py-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg text-[11px] font-bold transition" title="ลบโฟลเดอร์"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>`;
  }).join('');

  // การ์ด "ยังไม่ได้จัดโฟลเดอร์" (เฉพาะหน้าแรก)
  if(!cur) {
    const noneCount = appState.documents.filter(d => !d.folderId).length;
    if(noneCount > 0) {
      cards += `
      <div onclick="openFolder('__none__')" class="group bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 p-5 shadow-sm hover:shadow-lg hover:border-slate-400 transition cursor-pointer hover:-translate-y-1">
        <div class="w-12 h-12 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center mb-3 group-hover:scale-110 transition"><i class="fa-solid fa-inbox text-xl"></i></div>
        <p class="font-bold text-slate-600 text-sm">ยังไม่ได้จัดโฟลเดอร์</p>
        <p class="text-[11px] text-slate-400 mt-1">${noneCount} ไฟล์</p>
      </div>`;
    }
  }

  grid.innerHTML = cards || `<p class="col-span-full text-center text-slate-400 text-sm py-8">ยังไม่มีโฟลเดอร์ — กดปุ่ม "จัดการโฟลเดอร์" ด้านบนเพื่อสร้างโฟลเดอร์แรก</p>`;

  // ตารางไฟล์ในโฟลเดอร์ปัจจุบัน
  document.getElementById('folderFileTitle').innerText = isNone ? 'ไฟล์ที่ยังไม่ได้จัดโฟลเดอร์' : (cur ? 'ไฟล์ในโฟลเดอร์นี้' : 'ไฟล์ทั้งหมด');
  document.getElementById('folderFileCount').innerText = `${docsInFolder.length} ไฟล์`;
  const tb = document.getElementById('folderDocTableBody');
  if(docsInFolder.length === 0) {
    tb.innerHTML = `<tr><td colspan="4" class="py-10 text-center text-slate-400 text-sm font-medium">ไม่มีไฟล์ในนี้</td></tr>`;
  } else {
    tb.innerHTML = docsInFolder.map(d => `
      <tr class="hover:bg-slate-50 border-b transition">
        <td class="py-3 px-4 flex items-center gap-3 font-medium text-slate-700">
          <div class="w-8 h-8 rounded bg-teal-50 text-teal-500 flex items-center justify-center shrink-0"><i class="fa-solid fa-file-pdf"></i></div>
          <span class="truncate max-w-[220px]" title="${d.title}">${d.title}</span>
        </td>
        <td class="py-3 px-2"><span class="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold">${d.docType || 'ทั่วไป'}</span></td>
        <td class="py-3 px-2 text-slate-600">${d.uploader}</td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <button onclick="openIframeModal('${d.fileUrl}', '${d.title}', '${d.id}')" class="inline-flex items-center gap-1.5 text-teal-600 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg font-bold text-xs transition">
            เปิดไฟล์ <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </button>
          <button onclick="openFileShare('${d.id}')" class="w-8 h-8 inline-flex items-center justify-center text-indigo-500 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition align-middle" title="แชร์ไฟล์ (QR / ลิงก์)"><i class="fa-solid fa-qrcode"></i></button>
        </td>
      </tr>
    `).join('');
  }
}

// ---------------------------------------------------
// Folder Manager
// ---------------------------------------------------
function openFolderManager() {
  document.getElementById('folderManagerModal').classList.remove('hidden');
  renderFolderManagerList();
}

function renderFolderManagerList() {
  const parentSel = document.getElementById('newFolderParent');
  const sorted = [...appState.folders].sort((a, b) => folderPathOf(a.id).localeCompare(folderPathOf(b.id), 'th'));
  parentSel.innerHTML = '<option value="">— ระดับบนสุด (ไม่มีโฟลเดอร์แม่) —</option>' + sorted.map(f => {
    const depth = folderDepthOf(f.id);
    return `<option value="${f.id}">${'— '.repeat(depth)}${f.name}</option>`;
  }).join('');

  const list = document.getElementById('folderManagerList');
  if(appState.folders.length === 0) {
    list.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">ยังไม่มีโฟลเดอร์</p>`;
    return;
  }
  list.innerHTML = sorted.map(f => {
    const depth = folderDepthOf(f.id);
    return `
    <div class="flex justify-between items-center bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition">
      <span class="text-sm font-bold text-slate-700 truncate" title="${folderPathOf(f.id)}">${'<span class="text-slate-300 mr-1">' + '·&nbsp;'.repeat(depth) + '</span>'}${depth > 0 ? '↳ ' : '📁 '}${f.name}</span>
      <div class="flex gap-1.5 shrink-0">
        <button onclick="openShareModal('${f.id}')" class="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-[11px] font-bold transition"><i class="fa-solid fa-share-nodes mr-1"></i>${f.shareEnabled ? 'แชร์อยู่' : 'แชร์'}</button>
        <button onclick="handleDeleteFolder('${f.id}')" class="w-8 h-8 flex justify-center items-center rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition" title="ลบ"><i class="fa-solid fa-trash-can text-sm"></i></button>
      </div>
    </div>`;
  }).join('');
}

function handleAddFolderUI() {
  const name = document.getElementById('newFolderNameUI').value;
  const parentId = document.getElementById('newFolderParent').value;
  if(!name) return;

  fetch(API_URL + `?action=addFolder&name=${encodeURIComponent(name)}&parentId=${encodeURIComponent(parentId)}&username=${encodeURIComponent(appState.username || 'guest')}`).then(r => r.json()).then(res => {
    if(!res.success) return Swal.fire('ไม่สำเร็จ', res.message, 'warning');
    document.getElementById('newFolderNameUI').value = '';
    refreshData(true).then(() => {
      renderFolderManagerList();
      renderFolderView();
    });
  }).catch(() => {
    document.getElementById('newFolderNameUI').value = '';
    refreshData(true).then(() => { renderFolderManagerList(); renderFolderView(); });
  });
}

function handleDeleteFolder(id) {
  const f = appState.folders.find(x => x.id === id);
  if(!confirm(`ลบโฟลเดอร์ "${f ? f.name : id}" ใช่หรือไม่?\n\n(ลบได้เฉพาะโฟลเดอร์เปล่า ถ้ามีไฟล์หรือโฟลเดอร์ย่อยจะลบไม่ได้)`)) return;

  fetch(API_URL + `?action=deleteFolder&folderId=${encodeURIComponent(id)}&username=${encodeURIComponent(appState.username || 'guest')}`).then(r => r.json()).then(res => {
    if(!res.success) return Swal.fire('ลบไม่ได้', res.message, 'warning');
    if(appState.currentFolderId === id) appState.currentFolderId = '';
    refreshData(true).then(() => {
      renderFolderManagerList();
      renderFolderView();
    });
  });
}

// ---------------------------------------------------
// Folder Share Modal
// ---------------------------------------------------
function buildShareLink(token) {
  const base = location.origin + location.pathname.replace(/index\.html$/, '');
  return base + 'view.html?f=' + token;
}

function openShareModal(folderId) {
  window._shareTargetId = folderId;
  renderShareModal();
  document.getElementById('shareFolderModal').classList.remove('hidden');
}

function closeShareModal() {
  document.getElementById('shareFolderModal').classList.add('hidden');
}

function renderShareModal() {
  const f = appState.folders.find(x => x.id === window._shareTargetId);
  if(!f) return;
  document.getElementById('shareFolderName').innerText = folderPathOf(f.id);
  const area = document.getElementById('shareStatusArea');

  if(f.shareEnabled && f.shareToken) {
    const link = buildShareLink(f.shareToken);
    area.innerHTML = `
      <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 flex items-center gap-2">
        <i class="fa-solid fa-circle-check"></i> เปิดแชร์อยู่ — คนที่มีลิงก์ดูได้
      </div>
      <div class="flex gap-3 items-center">
        <div class="p-2.5 bg-white rounded-xl border border-slate-200 shrink-0">
          <div id="shareQrBox"></div>
          <p class="text-[9px] text-slate-400 font-bold text-center mt-1">สแกน QR</p>
        </div>
        <div class="flex-1 space-y-2 min-w-0">
          <div class="flex gap-2">
            <input type="text" readonly value="${link}" id="shareLinkInput" class="flex-1 min-w-0 px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-600 outline-none">
            <button onclick="copyShareLink()" class="px-4 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition shrink-0"><i class="fa-solid fa-copy mr-1"></i>คัดลอก</button>
          </div>
          <a href="https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(link)}" target="_blank" rel="noopener" class="flex items-center justify-center gap-2 w-full py-2.5 bg-[#06C755] text-white font-bold text-xs rounded-xl shadow-md hover:bg-emerald-500 transition"><i class="fa-brands fa-line text-base"></i> แชร์ลิงก์นี้ผ่าน LINE</a>
        </div>
      </div>
      <button onclick="toggleFolderShare(false)" class="w-full py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition"><i class="fa-solid fa-ban mr-1"></i>ปิดการแชร์ (ลิงก์จะใช้ไม่ได้ทันที)</button>`;
    const qrEl = document.getElementById('shareQrBox');
    if(qrEl && typeof QRCode !== 'undefined') {
      new QRCode(qrEl, { text: link, width: 110, height: 110, correctLevel: QRCode.CorrectLevel.M });
    }
  } else {
    area.innerHTML = `
      <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 flex items-center gap-2">
        <i class="fa-solid fa-circle-info"></i> ยังไม่ได้เปิดแชร์ — กดปุ่มด้านล่างเพื่อสร้างลิงก์
      </div>
      <button onclick="toggleFolderShare(true)" class="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5 transition"><i class="fa-solid fa-link mr-2"></i>สร้างลิงก์แชร์โฟลเดอร์นี้</button>`;
  }
}

function toggleFolderShare(enabled) {
  fetch(API_URL + `?action=setFolderShare&folderId=${encodeURIComponent(window._shareTargetId)}&enabled=${enabled}&username=${encodeURIComponent(appState.username || 'guest')}`)
    .then(r => r.json()).then(res => {
      if(!res.success) return Swal.fire('ไม่สำเร็จ', res.message, 'warning');
      return refreshData(true).then(() => renderShareModal());
    })
    .catch(() => refreshData(true).then(() => renderShareModal()));
}

// ---------------------------------------------------
// ตั้งค่าแจ้งเตือน LINE
// ---------------------------------------------------
function saveLineConfig() {
  const token = document.getElementById('lineTokenInput').value.trim();
  const target = document.getElementById('lineTargetInput').value.trim();
  fetchWithTimeout(API_URL + `?action=setLineConfig&token=${encodeURIComponent(token)}&target=${encodeURIComponent(target)}&username=${encodeURIComponent(appState.username || 'admin')}`, 15000)
    .then(r => r.json()).then(res => {
      Swal.fire(res.success ? 'สำเร็จ' : 'ไม่สำเร็จ', res.message || '', res.success ? 'success' : 'error');
    }).catch(() => Swal.fire('เชื่อมต่อไม่ได้', 'ลองอีกครั้ง', 'warning'));
}

function testLineMsg() {
  Swal.fire({ title: 'กำลังส่ง...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  fetchWithTimeout(API_URL + `?action=testLineMessage`, 25000).then(r => r.json()).then(res => {
    Swal.fire(res.success ? 'ส่งแล้ว!' : 'ส่งไม่สำเร็จ', res.message, res.success ? 'success' : 'warning');
  }).catch(() => Swal.fire('หมดเวลา', 'ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง', 'warning'));
}

function copyShareLink() {
  const input = document.getElementById('shareLinkInput');
  input.select();
  const done = () => Swal.fire({ icon: 'success', title: 'คัดลอกลิงก์แล้ว', text: 'ส่งลิงก์นี้ให้เพื่อนได้เลย', timer: 1600, showConfirmButton: false });
  if(navigator.clipboard) navigator.clipboard.writeText(input.value).then(done).catch(() => { document.execCommand('copy'); done(); });
  else { document.execCommand('copy'); done(); }
}

// ---------------------------------------------------
// Drive Sync (นำเข้าไฟล์จาก Drive)
// ---------------------------------------------------
function openSyncModal() {
  document.getElementById('syncModal').classList.remove('hidden');
}

function closeSyncModal() {
  document.getElementById('syncModal').classList.add('hidden');
}

function startDriveSync() {
  const btn = document.getElementById('syncStartBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>กำลังสแกน Drive...';

  fetchWithTimeout(API_URL + `?action=syncFromDrive&username=${encodeURIComponent(appState.username || 'guest')}`, 180000)
    .then(r => r.json())
    .then(res => {
      btn.disabled = false;
      btn.innerHTML = 'เริ่มนำเข้า <i class="fa-solid fa-bolt ml-1"></i>';
      closeSyncModal();
      if(res.success) {
        Swal.fire({ icon: 'success', title: 'นำเข้าสำเร็จ!', text: res.message, confirmButtonColor: '#059669' });
      } else {
        Swal.fire('ไม่สำเร็จ', res.message, 'warning');
      }
      refreshData(true);
    })
    .catch(() => {
      btn.disabled = false;
      btn.innerHTML = 'เริ่มนำเข้า <i class="fa-solid fa-bolt ml-1"></i>';
      Swal.fire('ใช้เวลานานเกินไป', 'ลองกดอีกครั้ง — ถ้าไฟล์เยอะมากระบบอาจทำงานเบื้องหลังจนเสร็จก่อน รอสักครู่แล้วรีเฟรชดู', 'info');
    });
}
