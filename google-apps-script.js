// ============================================================
// Google Apps Script — CRUD Proxy untuk Dashboard Calendar Event
// Metropolitan Mall Bekasi
// PERBAIKAN: Handle Date object dari Google Sheets
// ============================================================

const SHEET_NAME = 'SCHEDULE EVENT';
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

    return output.setContent(JSON.stringify({ success: false, error: 'Unknown action: ' + action }));
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}
