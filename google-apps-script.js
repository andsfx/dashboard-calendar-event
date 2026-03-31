// ============================================================
// Google Apps Script — CRUD Proxy untuk Dashboard Calendar Event
// Metropolitan Mall Bekasi
// PERBAIKAN: Handle Date object dari Google Sheets
// ============================================================

const SHEET_NAME = 'SCHEDULE EVENT';
const DRAFT_SHEET_NAME = 'DRAFT EVENT';
const SPREADSHEET_ID = '1b9LfbnUz5lu6jtGRa60pAmmpAzKZWyamoGn-W4irWvQ';

// ---- Helpers ----

const BULAN_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const HARI_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const BULAN_MAP = {
  'Januari': '01', 'Februari': '02', 'Maret': '03', 'April': '04',
  'Mei': '05', 'Juni': '06', 'Juli': '07', 'Agustus': '08',
  'September': '09', 'Oktober': '10', 'November': '11', 'Desember': '12'
};

// Convert Date object to formatted string
function formatDate(dateObj) {
  if (!(dateObj instanceof Date)) return { dateStr: '', tanggal: '', day: '', monthName: '' };
  var y = dateObj.getFullYear();
  var m = dateObj.getMonth() + 1;
  var d = dateObj.getDate();
  var dayOfWeek = HARI_NAMES[dateObj.getDay()];
  var monthName = BULAN_NAMES[m];
  var padDay = d < 10 ? '0' + d : '' + d;
  var padMonth = m < 10 ? '0' + m : '' + m;
  return {
    dateStr: y + '-' + padMonth + '-' + padDay,
    tanggal: d + ' ' + monthName + ' ' + y,
    day: dayOfWeek,
    monthName: monthName
  };
}

function dateStrToIndonesian(dateStr) {
  var parts = dateStr.split('-');
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  var d = parseInt(parts[2], 10);
  var dateObj = new Date(y, m - 1, d);
  var dayName = HARI_NAMES[dateObj.getDay()];
  var monthName = BULAN_NAMES[m];
  return dayName + ', ' + (d < 10 ? '0' + d : d) + ' ' + monthName + ' ' + y;
}

function getSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(SHEET_NAME);
}

function getDraftSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(DRAFT_SHEET_NAME);
  var headers = [
    'Tanggal',
    'Jam',
    'Acara',
    'Lokasi',
    'EO',
    'Penanggung Jawab',
    'Nomor Telepon',
    'Keterangan',
    'Progress',
    'Published',
    'Published At',
    'Deleted',
    'Deleted At'
  ];

  if (!sheet) {
    sheet = ss.insertSheet(DRAFT_SHEET_NAME);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  } else if (sheet.getLastColumn() < headers.length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
}

function parseLooseDate(value) {
  if (!value) return { dateStr: '', tanggal: '', day: '', monthName: '' };
  if (value instanceof Date) return formatDate(value);

  var raw = String(value).trim();
  var isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return formatDate(new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10)));
  }

  var indoMatch = raw.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (indoMatch && BULAN_MAP[indoMatch[2]]) {
    return formatDate(new Date(parseInt(indoMatch[3], 10), parseInt(BULAN_MAP[indoMatch[2]], 10) - 1, parseInt(indoMatch[1], 10)));
  }

  return { dateStr: '', tanggal: '', day: '', monthName: '' };
}

function isMonthHeader(text) {
  return /^(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4}$/i.test(text);
}

// ---- READ: Get all events ----

function getAllEvents() {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  var events = [];
  var themes = [];
  var lastDate = '';
  var lastDateStr = '';
  var lastDay = '';
  var currentMonth = '';

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var colA = String(row[0] || '').trim();
    var colB = row[1]; // Could be Date or String
    var colC = String(row[2] || '').trim();
    var colD = String(row[3] || '').trim();
    var colE = String(row[4] || '').trim();
    var colF = String(row[5] || '').trim();
    var colG = String(row[6] || '').trim();

    // Skip title row
    if (i === 0 && colA.toLowerCase().includes('schedule')) continue;

    // Check for month header
    if (isMonthHeader(colA)) {
      currentMonth = colA.split(' ')[0];
      continue;
    }

    // Check for column header row
    if (String(colB || '').toLowerCase() === 'tanggal') continue;
    if (colC.toLowerCase() === 'jam' && colD.toLowerCase() === 'acara') continue;

    // Check for theme rows (rows 1-9)
    if (i >= 1 && i <= 9 && colB instanceof Date && row[2] instanceof Date) {
      var startFormatted = formatDate(colB);
      var endFormatted = formatDate(row[2]);
      if (startFormatted.dateStr && endFormatted.dateStr && colD) {
        themes.push({
          id: 'th-' + (themes.length + 1),
          name: colD,
          dateStart: startFormatted.dateStr,
          dateEnd: endFormatted.dateStr
        });
        continue;
      }
    }

    // Handle date in column B
    if (colB instanceof Date) {
      var formatted = formatDate(colB);
      lastDate = formatted.tanggal;
      lastDateStr = formatted.dateStr;
      lastDay = formatted.day;
      // Always update currentMonth from the actual date
      currentMonth = formatted.monthName;
    }

    // Skip if no valid date yet
    if (!lastDateStr) continue;

    // Skip if no event name in column D
    if (!colD || colD.toLowerCase() === 'acara') continue;

    // Add event
    events.push({
      sheetRow: i + 1,
      tanggal: lastDate,
      dateStr: lastDateStr,
      day: lastDay,
      jam: colC,
      acara: colD,
      lokasi: colE,
      eo: colF,
      keterangan: colG,
      month: currentMonth
    });
  }

  return { events: events, themes: themes };
}

// ---- CREATE: Add new event ----

function addEvent(eventData) {
  var sheet = getSheet();
  var lastRow = sheet.getLastRow();
  var insertRow = lastRow + 1;
  
  // Format date as text: "Hari, DD Bulan YYYY"
  var dateDisplay = dateStrToIndonesian(eventData.dateStr);

  sheet.appendRow([
    '',
    dateDisplay,
    eventData.jam || '',
    eventData.acara || '',
    eventData.lokasi || '',
    eventData.eo || '',
    eventData.keterangan || ''
  ]);

  return { success: true, row: insertRow };
}

// ---- UPDATE: Edit existing event ----

function updateEvent(eventData) {
  var sheet = getSheet();
  var sheetRow = eventData.sheetRow;

  if (!sheetRow || sheetRow < 1) {
    return { success: false, error: 'Invalid row number' };
  }

  // Format date as text: "Hari, DD Bulan YYYY"
  var dateDisplay = dateStrToIndonesian(eventData.dateStr);

  sheet.getRange(sheetRow, 2).setValue(dateDisplay);
  sheet.getRange(sheetRow, 3).setValue(eventData.jam || '');
  sheet.getRange(sheetRow, 4).setValue(eventData.acara || '');
  sheet.getRange(sheetRow, 5).setValue(eventData.lokasi || '');
  sheet.getRange(sheetRow, 6).setValue(eventData.eo || '');
  sheet.getRange(sheetRow, 7).setValue(eventData.keterangan || '');

  return { success: true };
}

// ---- DELETE: Remove event ----

function deleteEvent(sheetRow) {
  var sheet = getSheet();

  if (!sheetRow || sheetRow < 1) {
    return { success: false, error: 'Invalid row number' };
  }

  sheet.deleteRow(sheetRow);
  return { success: true };
}

// ---- DRAFT EVENT CRUD ----

function getAllDraftEvents() {
  var sheet = getDraftSheet();
  var data = sheet.getDataRange().getValues();
  var drafts = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var formatted = parseLooseDate(row[0]);
    var acara = String(row[2] || '').trim();

    if (!formatted.dateStr || !acara) continue;

    var publishedRaw = row[9];
    var published = publishedRaw === true || String(publishedRaw).toLowerCase() === 'true';
    var publishedAt = row[10] instanceof Date ? row[10].toISOString() : String(row[10] || '');
    var deletedRaw = row[11];
    var deleted = deletedRaw === true || String(deletedRaw).toLowerCase() === 'true';
    var deletedAt = row[12] instanceof Date ? row[12].toISOString() : String(row[12] || '');

    drafts.push({
      sheetRow: i + 1,
      tanggal: formatted.tanggal,
      dateStr: formatted.dateStr,
      day: formatted.day,
      jam: String(row[1] || '').trim(),
      acara: acara,
      lokasi: String(row[3] || '').trim(),
      eo: String(row[4] || '').trim(),
      pic: String(row[5] || '').trim(),
      phone: String(row[6] || '').trim(),
      keterangan: String(row[7] || '').trim(),
      month: formatted.monthName,
      progress: String(row[8] || 'draft').trim().toLowerCase() || 'draft',
      published: published,
      publishedAt: publishedAt,
      deleted: deleted,
      deletedAt: deletedAt
    });
  }

  return drafts;
}

function addDraftEvent(draftData) {
  var sheet = getDraftSheet();
  var lastRow = sheet.getLastRow();
  var insertRow = lastRow + 1;
  var parts = String(draftData.dateStr || '').split('-');
  var draftDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));

  sheet.appendRow([
    draftDate,
    draftData.jam || '',
    draftData.acara || '',
    draftData.lokasi || '',
    draftData.eo || '',
    draftData.pic || '',
    draftData.phone || '',
    draftData.keterangan || '',
    draftData.progress || 'draft',
    false,
    '',
    false,
    ''
  ]);

  return { success: true, row: insertRow };
}

function updateDraftEvent(draftData) {
  var sheet = getDraftSheet();
  var sheetRow = draftData.sheetRow;

  if (!sheetRow || sheetRow < 2) {
    return { success: false, error: 'Invalid draft row number' };
  }

  var current = sheet.getRange(sheetRow, 1, 1, 13).getValues()[0];
  var parts = String(draftData.dateStr || '').split('-');
  var draftDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));

  sheet.getRange(sheetRow, 1, 1, 13).setValues([[
    draftDate,
    draftData.jam || '',
    draftData.acara || '',
    draftData.lokasi || '',
    draftData.eo || '',
    draftData.pic || '',
    draftData.phone || '',
    draftData.keterangan || '',
    draftData.progress || current[8] || 'draft',
    typeof draftData.published === 'boolean' ? draftData.published : current[9],
    draftData.publishedAt || current[10] || '',
    typeof draftData.deleted === 'boolean' ? draftData.deleted : current[11],
    draftData.deletedAt || current[12] || ''
  ]]);

  return { success: true };
}

function deleteDraftEvent(sheetRow) {
  var sheet = getDraftSheet();

  if (!sheetRow || sheetRow < 2) {
    return { success: false, error: 'Invalid draft row number' };
  }

  var row = sheet.getRange(sheetRow, 1, 1, 13).getValues()[0];
  var existingNote = String(row[7] || '').trim();
  var deletedAt = new Date();
  var deletedNote = 'Dihapus admin pada ' + Utilities.formatDate(deletedAt, Session.getScriptTimeZone(), 'dd MMM yyyy HH:mm');
  var nextNote = existingNote ? existingNote + ' | ' + deletedNote : deletedNote;

  sheet.getRange(sheetRow, 8).setValue(nextNote);
  sheet.getRange(sheetRow, 9).setValue('cancel');
  sheet.getRange(sheetRow, 12).setValue(true);
  sheet.getRange(sheetRow, 13).setValue(deletedAt);
  return { success: true };
}

function publishDraftEvent(sheetRow) {
  var sheet = getDraftSheet();

  if (!sheetRow || sheetRow < 2) {
    return { success: false, error: 'Invalid draft row number' };
  }

  var row = sheet.getRange(sheetRow, 1, 1, 13).getValues()[0];
  var formatted = parseLooseDate(row[0]);
  var progress = String(row[8] || 'draft').trim().toLowerCase();
  var published = row[9] === true || String(row[9]).toLowerCase() === 'true';
  var deleted = row[11] === true || String(row[11]).toLowerCase() === 'true';

  if (!formatted.dateStr || !String(row[2] || '').trim()) {
    return { success: false, error: 'Draft event data is incomplete' };
  }
  if (progress !== 'confirm') {
    return { success: false, error: 'Draft harus berstatus confirm sebelum dipublish' };
  }
  if (published) {
    return { success: false, error: 'Draft ini sudah dipublish' };
  }
  if (deleted) {
    return { success: false, error: 'Draft ini sudah dihapus dan masuk riwayat' };
  }

  var publishResult = addEvent({
    dateStr: formatted.dateStr,
    jam: String(row[1] || '').trim(),
    acara: String(row[2] || '').trim(),
    lokasi: String(row[3] || '').trim(),
    eo: String(row[4] || '').trim(),
    keterangan: String(row[7] || '').trim()
  });

  if (!publishResult.success) {
    return publishResult;
  }

  sheet.getRange(sheetRow, 9).setValue('confirm');
  sheet.getRange(sheetRow, 10).setValue(true);
  sheet.getRange(sheetRow, 11).setValue(new Date());

  return { success: true, row: publishResult.row };
}

// ---- Web App Handlers ----

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'read';
  var output = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);

  try {
    if (action === 'read') {
      var result = getAllEvents();
      return output.setContent(JSON.stringify({ success: true, data: result }));
    }

    if (action === 'create') {
      var createData = JSON.parse(e.parameter.data || '{}');
      return output.setContent(JSON.stringify(addEvent(createData)));
    }

    if (action === 'update') {
      var updateData = JSON.parse(e.parameter.data || '{}');
      return output.setContent(JSON.stringify(updateEvent(updateData)));
    }

    if (action === 'delete') {
      var deleteRow = parseInt(e.parameter.sheetRow || '0', 10);
      return output.setContent(JSON.stringify(deleteEvent(deleteRow)));
    }

    if (action === 'readDrafts') {
      return output.setContent(JSON.stringify({ success: true, data: getAllDraftEvents() }));
    }

    if (action === 'createDraft') {
      var createDraftData = JSON.parse(e.parameter.data || '{}');
      return output.setContent(JSON.stringify(addDraftEvent(createDraftData)));
    }

    if (action === 'updateDraft') {
      var updateDraftData = JSON.parse(e.parameter.data || '{}');
      return output.setContent(JSON.stringify(updateDraftEvent(updateDraftData)));
    }

    if (action === 'deleteDraft') {
      var deleteDraftRow = parseInt(e.parameter.sheetRow || '0', 10);
      return output.setContent(JSON.stringify(deleteDraftEvent(deleteDraftRow)));
    }

    if (action === 'publishDraft') {
      var publishDraftRow = parseInt(e.parameter.sheetRow || '0', 10);
      return output.setContent(JSON.stringify(publishDraftEvent(publishDraftRow)));
    }

    if (action === 'debug') {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var sheets = ss.getSheets().map(function(s) { return s.getName(); });
      return output.setContent(JSON.stringify({
        success: true,
        spreadsheetTitle: ss.getName(),
        sheets: sheets,
        sheetName: SHEET_NAME
      }));
    }

    return output.setContent(JSON.stringify({ success: false, error: 'Unknown action: ' + action }));
  } catch (err) {
    return output.setContent(JSON.stringify({ success: false, error: err.message }));
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var output = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);

    if (action === 'create') {
      return output.setContent(JSON.stringify(addEvent(body.data)));
    }
    if (action === 'update') {
      return output.setContent(JSON.stringify(updateEvent(body.data)));
    }
    if (action === 'delete') {
      return output.setContent(JSON.stringify(deleteEvent(body.sheetRow)));
    }

    if (action === 'createDraft') {
      return output.setContent(JSON.stringify(addDraftEvent(body.data)));
    }
    if (action === 'updateDraft') {
      return output.setContent(JSON.stringify(updateDraftEvent(body.data)));
    }
    if (action === 'deleteDraft') {
      return output.setContent(JSON.stringify(deleteDraftEvent(body.sheetRow)));
    }
    if (action === 'publishDraft') {
      return output.setContent(JSON.stringify(publishDraftEvent(body.sheetRow)));
    }

    return output.setContent(JSON.stringify({ success: false, error: 'Unknown action: ' + action }));
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}
