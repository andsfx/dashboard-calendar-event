// ============================================================
// Google Apps Script — CRUD Proxy untuk Dashboard Calendar Event
// Metropolitan Mall Bekasi
//
// CARA PAKAI:
// 1. Buka Google Spreadsheet
// 2. Menu: Extensions → Apps Script
// 3. Hapus semua kode default, paste seluruh kode ini
// 4. Klik Deploy → New deployment
//    - Type: Web app
//    - Execute as: Me
//    - Who has access: Anyone
// 5. Copy URL deployment, taruh di .env dashboard:
//    VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/xxxxx/exec
// ============================================================

const SHEET_NAME = 'Schedule Event';
const SPREADSHEET_ID = '1b9LfbnUz5lu6jtGRa60pAmmpAzKZWyamoGn-W4irWvQ';

// ---- Indonesian date helpers ----

const BULAN_MAP = {
  'Januari': '01', 'Februari': '02', 'Maret': '03', 'April': '04',
  'Mei': '05', 'Juni': '06', 'Juli': '07', 'Agustus': '08',
  'September': '09', 'Oktober': '10', 'November': '11', 'Desember': '12'
};

const BULAN_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const HARI_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function parseIndonesianDate(raw) {
  if (!raw || typeof raw !== 'string') return null;
  var cleaned = raw.trim();
  // Pattern: "Hari, DD Bulan YYYY" or "Hari DD Bulan YYYY"
  var match = cleaned.match(/^([^,\d]+)[,\s]+(\d{1,2})\s+([^\d]+)\s+(\d{4})$/);
  if (!match) return null;
  var day = match[1].trim();
  var dd = match[2];
  var bulan = match[3].trim();
  var yyyy = match[4];
  var mm = BULAN_MAP[bulan];
  if (!mm) return null;
  var padDay = dd.length === 1 ? '0' + dd : dd;
  return {
    dateStr: yyyy + '-' + mm + '-' + padDay,
    tanggal: dd + ' ' + bulan + ' ' + yyyy,
    day: day,
    monthName: bulan
  };
}

function dateStrToIndonesian(dateStr) {
  // "2026-01-08" → "Kamis, 08 Januari 2026"
  var parts = dateStr.split('-');
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  var d = parseInt(parts[2], 10);
  var dateObj = new Date(y, m - 1, d);
  var dayName = HARI_NAMES[dateObj.getDay()];
  var monthName = BULAN_NAMES[m];
  return dayName + ', ' + (d < 10 ? '0' + d : d) + ' ' + monthName + ' ' + y;
}

// ---- Helpers ----

function getSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(SHEET_NAME);
}

function isMonthHeader(row) {
  // Month header rows like "Januari 2026" in column A, rest empty
  var a = String(row[0] || '').trim();
  return /^(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4}$/i.test(a);
}

function isColumnHeader(row) {
  // Sub-header rows: column C = "Jam", column D = "Acara"
  var c = String(row[2] || '').trim();
  var d = String(row[3] || '').trim();
  return c.toLowerCase() === 'jam' && d.toLowerCase() === 'acara';
}

function isThemeRow(row, rowIndex) {
  // Theme rows are rows 2-9 (index 1-8) with Date Start, Date End, Event pattern
  if (rowIndex < 1 || rowIndex > 8) return false;
  var b = String(row[1] || '').trim();
  var c = String(row[2] || '').trim();
  var d = String(row[3] || '').trim();
  return b !== '' && c !== '' && d !== '' && parseIndonesianDate(b) !== null && parseIndonesianDate(c) !== null;
}

// ---- READ: Get all events ----

function getAllEvents() {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  var events = [];
  var themes = [];
  var lastDate = '';

  for (var i = 0; i < data.length; i++) {
    var row = data[i];

    // Skip header row (row 0: No, Date Start, Date End, Event)
    if (i === 0) continue;

    // Check if theme row
    if (isThemeRow(row, i)) {
      var startParsed = parseIndonesianDate(String(row[1] || ''));
      var endParsed = parseIndonesianDate(String(row[2] || ''));
      if (startParsed && endParsed) {
        themes.push({
          id: 'th-' + (themes.length + 1),
          name: String(row[3] || '').trim(),
          dateStart: startParsed.dateStr,
          dateEnd: endParsed.dateStr
        });
      }
      continue;
    }

    // Skip month headers and column headers
    if (isMonthHeader(row)) continue;
    if (isColumnHeader(row)) continue;

    var tanggalRaw = String(row[1] || '').trim();
    var jam = String(row[2] || '').trim();
    var acara = String(row[3] || '').trim();
    var lokasi = String(row[4] || '').trim();
    var eo = String(row[5] || '').trim();
    var keterangan = String(row[6] || '').trim();

    // Skip empty rows
    if (!acara && !tanggalRaw && !jam) continue;

    // Handle merged date cells (empty date = same as previous)
    if (tanggalRaw) {
      var parsed = parseIndonesianDate(tanggalRaw);
      if (parsed) {
        lastDate = tanggalRaw;
      }
    }

    // Skip rows without event name
    if (!acara) continue;

    var dateParsed = parseIndonesianDate(lastDate);
    if (!dateParsed) continue;

    events.push({
      sheetRow: i + 1, // 1-based row number in sheet
      tanggal: dateParsed.tanggal,
      dateStr: dateParsed.dateStr,
      day: dateParsed.day,
      jam: jam,
      acara: acara,
      lokasi: lokasi,
      eo: eo,
      keterangan: keterangan,
      month: dateParsed.monthName
    });
  }

  return { events: events, themes: themes };
}

// ---- CREATE: Add new event ----

function addEvent(eventData) {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();

  // Find the correct month section to insert into
  var targetMonth = eventData.month;
  var insertRow = -1;
  var inTargetMonth = false;

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    if (isMonthHeader(row)) {
      var headerMonth = String(row[0]).trim().split(' ')[0];
      if (headerMonth === targetMonth) {
        inTargetMonth = true;
      } else if (inTargetMonth) {
        // We've passed the target month, insert before this header
        insertRow = i + 1;
        break;
      }
    }
  }

  // If we're still in the target month at end of data, append
  if (insertRow === -1) {
    insertRow = data.length + 1;
  }

  var dateDisplay = dateStrToIndonesian(eventData.dateStr);

  sheet.insertRowBefore(insertRow);
  sheet.getRange(insertRow, 1).setValue(''); // No
  sheet.getRange(insertRow, 2).setValue(dateDisplay); // Tanggal
  sheet.getRange(insertRow, 3).setValue(eventData.jam || ''); // Jam
  sheet.getRange(insertRow, 4).setValue(eventData.acara || ''); // Acara
  sheet.getRange(insertRow, 5).setValue(eventData.lokasi || ''); // Lokasi
  sheet.getRange(insertRow, 6).setValue(eventData.eo || ''); // EO
  sheet.getRange(insertRow, 7).setValue(eventData.keterangan || ''); // Keterangan

  return { success: true, row: insertRow };
}

// ---- UPDATE: Edit existing event ----

function updateEvent(eventData) {
  var sheet = getSheet();
  var sheetRow = eventData.sheetRow;

  if (!sheetRow || sheetRow < 1) {
    return { success: false, error: 'Invalid row number' };
  }

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

// ---- Web App Handlers ----

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'read';

  try {
    if (action === 'read') {
      var result = getAllEvents();
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, data: result }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Unknown action: ' + action }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;

    if (action === 'create') {
      var createResult = addEvent(body.data);
      return ContentService
        .createTextOutput(JSON.stringify(createResult))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'update') {
      var updateResult = updateEvent(body.data);
      return ContentService
        .createTextOutput(JSON.stringify(updateResult))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'delete') {
      var deleteResult = deleteEvent(body.sheetRow);
      return ContentService
        .createTextOutput(JSON.stringify(deleteResult))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Unknown action: ' + action }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
