// ============================================================
// Google Apps Script — CRUD Proxy untuk Dashboard Calendar Event
// Metropolitan Mall Bekasi
// PERBAIKAN: Handle Date object dari Google Sheets
// ============================================================

const SHEET_NAME = 'schedule_event_data';
const LEGACY_EVENT_SHEET_NAME = 'SCHEDULE EVENT';
const DRAFT_SHEET_NAME = 'DRAFT EVENT';
const HOLIDAY_SHEET_NAME = 'LIBUR 2026';
const EVENT_SPREADSHEET_ID = '1b9LfbnUz5lu6jtGRa60pAmmpAzKZWyamoGn-W4irWvQ';
const LETTER_SPREADSHEET_ID = '1qaSZ-9RFsTDFqEa6GLJHoT_4hd8Kuv_elN4Uv_vGA0U';
const LETTER_SHEET_NAME = 'Form Responses 1';
const EVENT_HEADERS = [
  'Date',
  'Day',
  'Tanggal',
  'Jam',
  'Acara',
  'Lokasi',
  'EO',
  'Keterangan',
  'Status',
  'Jenis Acara',
  'Prioritas',
  'Model Event',
  'Nominal Event',
  'Keterangan Model Event'
];

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

function getEventSpreadsheet() {
  return SpreadsheetApp.openById(EVENT_SPREADSHEET_ID);
}

function getLetterSpreadsheet() {
  return SpreadsheetApp.openById(LETTER_SPREADSHEET_ID);
}

function getSheet() {
  return ensureEventSheet();
}

function getLegacyEventSheet() {
  return getEventSpreadsheet().getSheetByName(LEGACY_EVENT_SHEET_NAME);
}

function ensureEventSheet() {
  var ss = getEventSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getMaxColumns() < EVENT_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), EVENT_HEADERS.length - sheet.getMaxColumns());
  }

  sheet.getRange(1, 1, 1, EVENT_HEADERS.length).setValues([EVENT_HEADERS]);
  sheet.setFrozenRows(1);
  return sheet;
}

function getEventHeaderMap() {
  var sheet = ensureEventSheet();
  var headers = sheet.getRange(1, 1, 1, EVENT_HEADERS.length).getValues()[0];
  var map = {};

  for (var i = 0; i < headers.length; i++) {
    map[String(headers[i] || '').trim()] = i;
  }

  return map;
}

function toDisplayTanggal(value, fallback) {
  if (value instanceof Date) return formatDate(value).tanggal;
  var raw = String(value || '').trim();
  if (!raw) return fallback || '';
  var parsed = parseLooseDate(raw);
  return parsed.tanggal || raw;
}

function toDisplayDay(value, fallback) {
  if (value instanceof Date) return formatDate(value).day;
  var raw = String(value || '').trim();
  if (!raw) return fallback || '';
  return raw;
}

function parseEventCategories(value, fallbackCategory) {
  var raw = String(value || '').trim();
  var categories = raw
    ? raw.split('|').map(function(item) { return String(item || '').trim(); }).filter(function(item) { return !!item; })
    : [];

  if (categories.length === 0 && fallbackCategory) {
    categories = [String(fallbackCategory).trim()];
  }

  if (categories.length === 0) {
    categories = ['Umum'];
  }

  return categories;
}

function stringifyEventCategories(categories, fallbackCategory) {
  var values = Array.isArray(categories) ? categories : [];
  var normalized = values
    .map(function(item) { return String(item || '').trim(); })
    .filter(function(item, index, arr) { return !!item && arr.indexOf(item) === index; });

  if (normalized.length === 0 && fallbackCategory) {
    normalized = [String(fallbackCategory).trim()];
  }

  if (normalized.length === 0) {
    normalized = ['Umum'];
  }

  return normalized.join(' | ');
}

function getCanonicalEventRow(eventData) {
  var formatted = parseLooseDate(eventData.dateStr);
  var status = String(eventData.status || '').trim().toLowerCase();
  var categories = parseEventCategories(eventData.categories, eventData.category);
  var priority = String(eventData.priority || '').trim().toLowerCase();
  var eventModel = String(eventData.eventModel || '').trim().toLowerCase();

  if (!formatted.dateStr) {
    throw new Error('Tanggal event tidak valid');
  }

  if (status !== 'draft' && status !== 'upcoming' && status !== 'ongoing' && status !== 'past') {
    status = getAutoEventStatus(formatted.dateStr);
  }
  if (priority !== 'high' && priority !== 'medium' && priority !== 'low') {
    priority = 'medium';
  }
  if (eventModel !== 'free' && eventModel !== 'bayar' && eventModel !== 'support') {
    eventModel = '';
  }

  return [
    formatted.dateStr,
    formatted.day,
    formatted.tanggal,
    eventData.jam || '',
    eventData.acara || '',
    eventData.lokasi || '',
    eventData.eo || '',
    eventData.keterangan || '',
    status,
    stringifyEventCategories(categories),
    priority,
    eventModel,
    eventData.eventNominal || '',
    eventData.eventModelNotes || ''
  ];
}

function getLegacyEvents() {
  var sheet = getLegacyEventSheet();
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  var events = [];
  var lastDate = '';
  var lastDateStr = '';
  var lastDay = '';

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var colA = String(row[0] || '').trim();
    var colB = row[1];
    var colC = String(row[2] || '').trim();
    var colD = String(row[3] || '').trim();
    var colE = String(row[4] || '').trim();
    var colF = String(row[5] || '').trim();
    var colG = String(row[6] || '').trim();

    if (i === 0 && colA.toLowerCase().includes('schedule')) continue;
    if (isMonthHeader(colA)) continue;
    if (String(colB || '').toLowerCase() === 'tanggal') continue;
    if (colC.toLowerCase() === 'jam' && colD.toLowerCase() === 'acara') continue;
    if (i >= 1 && i <= 9 && colB instanceof Date && row[2] instanceof Date) continue;

    var formatted = parseLooseDate(colB);
    if (formatted.dateStr) {
      lastDate = formatted.tanggal;
      lastDateStr = formatted.dateStr;
      lastDay = formatted.day;
    }

    if (!lastDateStr) continue;
    if (!colD || colD.toLowerCase() === 'acara') continue;

    events.push({
      dateStr: lastDateStr,
      day: lastDay,
      tanggal: lastDate,
      jam: colC,
      acara: colD,
      lokasi: colE,
      eo: colF,
      keterangan: colG,
      category: detectEventCategory(colD),
      categories: [detectEventCategory(colD)],
      priority: 'medium',
      eventModel: '',
      eventNominal: '',
      eventModelNotes: ''
    });
  }

  return events;
}

function bootstrapEventSheet() {
  var sheet = ensureEventSheet();
  return {
    success: true,
    spreadsheetId: EVENT_SPREADSHEET_ID,
    sheetName: SHEET_NAME,
    headers: EVENT_HEADERS,
    totalColumns: EVENT_HEADERS.length,
    totalRows: Math.max(sheet.getLastRow(), 1)
  };
}

function debugEventSchema() {
  var sheet = ensureEventSheet();
  var headers = sheet.getRange(1, 1, 1, EVENT_HEADERS.length).getValues()[0];
  var mapping = {};

  for (var i = 0; i < headers.length; i++) {
    mapping[String(headers[i] || '').trim()] = i + 1;
  }

  return {
    success: true,
    spreadsheetId: EVENT_SPREADSHEET_ID,
    spreadsheetTitle: getEventSpreadsheet().getName(),
    sheetName: SHEET_NAME,
    headers: headers,
    mapping: mapping,
    totalRows: sheet.getLastRow(),
    totalColumns: sheet.getLastColumn()
  };
}

function migrateLegacyEventsToNewSheet() {
  var sheet = ensureEventSheet();
  var legacyEvents = getLegacyEvents();

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, EVENT_HEADERS.length).clearContent();
  }

  if (legacyEvents.length > 0) {
    var rows = legacyEvents.map(getCanonicalEventRow);
    sheet.getRange(2, 1, rows.length, EVENT_HEADERS.length).setValues(rows);
  }

  return {
    success: true,
    sourceSheet: LEGACY_EVENT_SHEET_NAME,
    targetSheet: SHEET_NAME,
    migratedRows: legacyEvents.length,
    totalRows: sheet.getLastRow()
  };
}

function getDraftSheet() {
  var ss = getEventSpreadsheet();
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

function getHolidaySheet() {
  var ss = getEventSpreadsheet();
  var sheet = ss.getSheetByName(HOLIDAY_SHEET_NAME);
  var headers = ['Tanggal', 'Nama Libur', 'Jenis', 'Keterangan'];

  if (!sheet) {
    sheet = ss.insertSheet(HOLIDAY_SHEET_NAME);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  } else if (sheet.getLastColumn() < headers.length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
}

function getLetterSheet() {
  var ss = getLetterSpreadsheet();
  var sheet = ss.getSheetByName(LETTER_SHEET_NAME);

  if (!sheet) {
    throw new Error('Letter sheet not found: ' + LETTER_SHEET_NAME);
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

function getAutoEventStatus(dateStr) {
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  if (dateStr < today) return 'past';
  if (dateStr === today) return 'ongoing';
  return 'upcoming';
}

function detectEventCategory(acara) {
  var name = String(acara || '').toLowerCase();
  if (/bazaar|bazar|pasar|market|jualan|booth/.test(name)) return 'Bazaar';
  if (/festival|fest|fair/.test(name)) return 'Festival';
  if (/workshop|pelatihan|training|kelas|belajar/.test(name)) return 'Workshop';
  if (/lomba|kompetisi|competition|contest|turnamen/.test(name)) return 'Kompetisi';
  if (/fashion|style|mode|catwalk|runway/.test(name)) return 'Fashion';
  if (/seminar|talkshow|talk\s?show|diskusi|symposium|kajian/.test(name)) return 'Seminar';
  if (/pameran|expo|exhibition|display/.test(name)) return 'Pameran';
  if (/konser|concert|musik|music|band|penyanyi/.test(name)) return 'Konser';
  if (/sosial|bakti|donor|charity|peduli|amal/.test(name)) return 'Sosial';
  if (/seni|art|crafts|kerajinan|lukis|drawing/.test(name)) return 'Seni';
  if (/sport|olahraga|fitness|yoga|senam|futsal|run|fun run/.test(name)) return 'Olahraga';
  if (/hiburan|entertainment|carnival|party/.test(name)) return 'Hiburan';
  if (/karir|career|job|rekrut|hiring|beasiswa/.test(name)) return 'Karir';
  if (/produk|product|launch|launching|promo|brand/.test(name)) return 'Produk';
  if (/kids|anak|children|baby|balita|pinguin/.test(name)) return 'Anak';
  if (/food|kuliner|culinary|makanan|minuman|cafe|resto/.test(name)) return 'Kuliner';
  if (/game|gaming|esport|tekno|tech/.test(name)) return 'Teknologi';
  if (/health|kesehatan|medis|dokter|farmasi/.test(name)) return 'Kesehatan';
  return 'Umum';
}

function getAllHolidays() {
  var sheet = getHolidaySheet();
  var data = sheet.getDataRange().getValues();
  var holidays = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var formatted = parseLooseDate(row[0]);
    var name = String(row[1] || '').trim();
    var type = String(row[2] || '').trim().toLowerCase();
    var description = String(row[3] || '').trim();

    if (!formatted.dateStr || !name) continue;

    if (type !== 'libur_nasional' && type !== 'cuti_bersama') {
      type = 'libur_nasional';
    }

    holidays.push({
      sheetRow: i + 1,
      tanggal: formatted.tanggal,
      dateStr: formatted.dateStr,
      day: formatted.day,
      month: formatted.monthName,
      name: name,
      type: type,
      description: description,
    });
  }

  return holidays;
}

// ---- READ: Get all events ----

function getAllEvents() {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  var events = [];
  var headerMap = getEventHeaderMap();

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var acara = String(row[headerMap['Acara']] || '').trim();
    if (!acara) continue;

    var dateValue = row[headerMap['Date']] || row[headerMap['Tanggal']];
    var formatted = parseLooseDate(dateValue);
    if (!formatted.dateStr) continue;

    var categories = parseEventCategories(row[headerMap['Jenis Acara']], 'Umum');
    var status = String(row[headerMap['Status']] || '').trim().toLowerCase();
    if (status !== 'draft' && status !== 'upcoming' && status !== 'ongoing' && status !== 'past') {
      status = getAutoEventStatus(formatted.dateStr);
    }

    var priority = String(row[headerMap['Prioritas']] || '').trim().toLowerCase();
    if (priority !== 'high' && priority !== 'medium' && priority !== 'low') {
      priority = 'medium';
    }

    var eventModel = String(row[headerMap['Model Event']] || '').trim().toLowerCase();
    if (eventModel !== 'free' && eventModel !== 'bayar' && eventModel !== 'support') {
      eventModel = '';
    }

    events.push({
      sheetRow: i + 1,
      tanggal: toDisplayTanggal(row[headerMap['Tanggal']], formatted.tanggal),
      dateStr: formatted.dateStr,
      day: toDisplayDay(row[headerMap['Day']], formatted.day),
      jam: String(row[headerMap['Jam']] || '').trim(),
      acara: acara,
      lokasi: String(row[headerMap['Lokasi']] || '').trim(),
      eo: String(row[headerMap['EO']] || '').trim(),
      keterangan: String(row[headerMap['Keterangan']] || '').trim(),
      month: formatted.monthName,
      status: status,
      category: categories[0] || 'Umum',
      categories: categories,
      priority: priority,
      eventModel: eventModel,
      eventNominal: String(row[headerMap['Nominal Event']] || '').trim(),
      eventModelNotes: String(row[headerMap['Keterangan Model Event']] || '').trim()
    });
  }

  return { events: events, themes: [], holidays: getAllHolidays() };
}

// ---- CREATE: Add new event ----

function addEvent(eventData) {
  var sheet = getSheet();
  try {
    sheet.appendRow(getCanonicalEventRow(eventData));
  } catch (err) {
    return { success: false, error: err.message };
  }

  return { success: true, row: sheet.getLastRow() };
}

// ---- UPDATE: Edit existing event ----

function updateEvent(eventData) {
  var sheet = getSheet();
  var sheetRow = eventData.sheetRow;

  if (!sheetRow || sheetRow < 1) {
    return { success: false, error: 'Invalid row number' };
  }

  try {
    sheet.getRange(sheetRow, 1, 1, EVENT_HEADERS.length).setValues([getCanonicalEventRow(eventData)]);
  } catch (err) {
    return { success: false, error: err.message };
  }

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

function restoreDraftEvent(sheetRow) {
  var sheet = getDraftSheet();

  if (!sheetRow || sheetRow < 2) {
    return { success: false, error: 'Invalid draft row number' };
  }

  var row = sheet.getRange(sheetRow, 1, 1, 13).getValues()[0];
  var published = row[9] === true || String(row[9]).toLowerCase() === 'true';

  if (published) {
    return { success: false, error: 'Draft yang sudah dipublish tidak bisa dipulihkan' };
  }

  var existingNote = String(row[7] || '').trim();
  var restoredAt = new Date();
  var restoredNote = 'Dipulihkan admin pada ' + Utilities.formatDate(restoredAt, Session.getScriptTimeZone(), 'dd MMM yyyy HH:mm');
  var nextNote = existingNote ? existingNote + ' | ' + restoredNote : restoredNote;

  sheet.getRange(sheetRow, 8).setValue(nextNote);
  sheet.getRange(sheetRow, 9).setValue('draft');
  sheet.getRange(sheetRow, 12).setValue(false);
  sheet.getRange(sheetRow, 13).setValue('');

  return { success: true };
}

function createLetterRequest(data) {
  var sheet = getLetterSheet();
  var timestamp = new Date();

  sheet.appendRow([
    timestamp,
    data.tanggalSurat || '',
    data.nomorSurat || '',
    data.namaEO || '',
    data.penanggungJawab || '',
    data.alamatEO || '',
    data.namaEvent || '',
    data.lokasi || '',
    data.hariTanggalPelaksanaan || '',
    data.waktuPelaksanaan || '',
    data.nomorTelepon || '',
    data.hariTanggalLoading || '',
    data.waktuLoading || '',
    '',
    '',
    '',
    ''
  ]);

  return { success: true, row: sheet.getLastRow() };
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

    if (action === 'restoreDraft') {
      var restoreDraftRow = parseInt(e.parameter.sheetRow || '0', 10);
      return output.setContent(JSON.stringify(restoreDraftEvent(restoreDraftRow)));
    }

    if (action === 'createLetterRequest') {
      var createLetterData = JSON.parse(e.parameter.data || '{}');
      return output.setContent(JSON.stringify(createLetterRequest(createLetterData)));
    }

    if (action === 'bootstrapEventSheet') {
      return output.setContent(JSON.stringify(bootstrapEventSheet()));
    }

    if (action === 'debugSchema') {
      return output.setContent(JSON.stringify(debugEventSchema()));
    }

    if (action === 'migrateLegacyEvents') {
      return output.setContent(JSON.stringify(migrateLegacyEventsToNewSheet()));
    }

    if (action === 'debug') {
      var eventSs = getEventSpreadsheet();
      var eventSheets = eventSs.getSheets().map(function(s) { return s.getName(); });
      var letterSs = getLetterSpreadsheet();
      var letterSheets = letterSs.getSheets().map(function(s) { return s.getName(); });
      return output.setContent(JSON.stringify({
        success: true,
        eventSpreadsheetTitle: eventSs.getName(),
        eventSheets: eventSheets,
        eventSheetName: SHEET_NAME,
        legacyEventSheetName: LEGACY_EVENT_SHEET_NAME,
        eventHeaders: EVENT_HEADERS,
        draftSheetName: DRAFT_SHEET_NAME,
        holidaySheetName: HOLIDAY_SHEET_NAME,
        letterSpreadsheetTitle: letterSs.getName(),
        letterSheets: letterSheets,
        letterSheetName: LETTER_SHEET_NAME
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
    if (action === 'restoreDraft') {
      return output.setContent(JSON.stringify(restoreDraftEvent(body.sheetRow)));
    }
    if (action === 'createLetterRequest') {
      return output.setContent(JSON.stringify(createLetterRequest(body.data)));
    }
    if (action === 'bootstrapEventSheet') {
      return output.setContent(JSON.stringify(bootstrapEventSheet()));
    }
    if (action === 'debugSchema') {
      return output.setContent(JSON.stringify(debugEventSchema()));
    }
    if (action === 'migrateLegacyEvents') {
      return output.setContent(JSON.stringify(migrateLegacyEventsToNewSheet()));
    }

    return output.setContent(JSON.stringify({ success: false, error: 'Unknown action: ' + action }));
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}
