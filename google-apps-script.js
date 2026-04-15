// ============================================================
// Google Apps Script — CRUD Proxy untuk Dashboard Calendar Event
// Metropolitan Mall Bekasi
// PERBAIKAN: Handle Date object dari Google Sheets
// ============================================================

const SHEET_NAME = 'schedule_event_data';
const LEGACY_EVENT_SHEET_NAME = 'SCHEDULE EVENT';
const DRAFT_SHEET_NAME = 'DRAFT EVENT';
const HOLIDAY_SHEET_NAME = 'LIBUR 2026';
const THEME_SHEET_NAME = 'ANNUAL THEMES';
const EVENT_SPREADSHEET_ID = '1b9LfbnUz5lu6jtGRa60pAmmpAzKZWyamoGn-W4irWvQ';
const LETTER_SPREADSHEET_ID = '1qaSZ-9RFsTDFqEa6GLJHoT_4hd8Kuv_elN4Uv_vGA0U';
const LETTER_SHEET_NAME = 'Form Responses 1';
const LETTER_FORM_DEFAULT_CONFIG = {
  viewUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSduvNFIWbfjWONr-4-VnZRovCNdWa09jxPoOYPq1u6nmAy3cw/viewform',
  responseUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSduvNFIWbfjWONr-4-VnZRovCNdWa09jxPoOYPq1u6nmAy3cw/formResponse',
  fields: {
    tanggalSurat: 'entry.396954138',
    nomorSurat: 'entry.998775376',
    namaEO: 'entry.1480637284',
    penanggungJawab: 'entry.1748978808',
    alamatEO: 'entry.106428972',
    namaEvent: 'entry.1492656390',
    lokasi: 'entry.602007555',
    hariTanggalPelaksanaan: 'entry.1866343511',
    waktuPelaksanaan: 'entry.711834080',
    nomorTelepon: 'entry.278386304',
    hariTanggalLoading: 'entry.1067209676',
    waktuLoading: 'entry.893311586'
  }
};
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
  'Keterangan Model Event',
  'Penanggung Jawab',
  'Nomor Handphone',
  'ID',
  'Source Draft ID'
];
const ANNUAL_THEME_HEADERS = ['Date Start', 'Date End', 'Event', 'Color', 'ID'];
const ANNUAL_THEME_SEED = [
  ['2026-01-17', '2026-02-17', 'Joyful January', '#6366f1', ''],
  ['2026-02-20', '2026-03-29', 'Season Of Blessings', '#f59e0b', ''],
  ['2026-04-01', '2026-05-17', 'Harmony Of Heritage', '#10b981', ''],
  ['2026-05-01', '2026-07-19', 'Kick Off & School Vibes', '#0ea5e9', ''],
  ['2026-08-01', '2026-08-01', 'Independence Blast', '#ef4444', ''],
  ['2026-09-01', '2026-10-31', 'Culture Pop!', '#8b5cf6', ''],
  ['2026-11-01', '2026-11-30', 'We Are Community', '#14b8a6', ''],
  ['2026-12-01', '2027-01-10', 'Sparkling Holiday', '#f97316', '']
];
const DRAFT_HEADERS = [
  'Tanggal',
  'Jam',
  'Acara',
  'Lokasi',
  'EO',
  'Penanggung Jawab',
  'Nomor Telepon',
  'Keterangan',
  'Catatan Internal',
  'Jenis Acara',
  'Prioritas',
  'Model Event',
  'Nominal Event',
  'Keterangan Model Event',
  'Progress',
  'Published',
  'Published At',
  'Deleted',
  'Deleted At',
  'ID'
];
const HOLIDAY_HEADERS = ['Tanggal', 'Nama Libur', 'Jenis', 'Keterangan', 'ID'];

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

function generateStableId(prefix) {
  return prefix + '_' + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}

function ensureHeaders(sheet, headers) {
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
}

function getHeaderMapForSheet(sheet, headers) {
  var values = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var map = {};

  for (var i = 0; i < values.length; i++) {
    map[String(values[i] || '').trim()] = i;
  }

  return map;
}

function ensureStableIds(sheet, headers, idHeader, prefix) {
  var headerMap = getHeaderMapForSheet(sheet, headers);
  var idIndex = headerMap[idHeader];
  if (typeof idIndex !== 'number') return;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var values = sheet.getRange(2, idIndex + 1, lastRow - 1, 1).getValues();
  var seen = {};

  for (var i = 0; i < values.length; i++) {
    var currentId = String(values[i][0] || '').trim();
    if (!currentId || seen[currentId]) {
      currentId = generateStableId(prefix);
      values[i][0] = currentId;
    }
    seen[currentId] = true;
  }

  sheet.getRange(2, idIndex + 1, values.length, 1).setValues(values);
}

function findRowById(sheet, headers, idHeader, id) {
  if (!id) return 0;
  var headerMap = getHeaderMapForSheet(sheet, headers);
  var idIndex = headerMap[idHeader];
  if (typeof idIndex !== 'number') return 0;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  var values = sheet.getRange(2, idIndex + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === String(id).trim()) {
      return i + 2;
    }
  }

  return 0;
}

function getLetterSpreadsheet() {
  return SpreadsheetApp.openById(LETTER_SPREADSHEET_ID);
}

function getAnnualThemeSheet() {
  var ss = getEventSpreadsheet();
  var sheet = ss.getSheetByName(THEME_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(THEME_SHEET_NAME);
  }

  ensureHeaders(sheet, ANNUAL_THEME_HEADERS);

  if (sheet.getLastRow() <= 1) {
    sheet.getRange(2, 1, ANNUAL_THEME_SEED.length, ANNUAL_THEME_HEADERS.length).setValues(ANNUAL_THEME_SEED);
  }

  ensureStableIds(sheet, ANNUAL_THEME_HEADERS, 'ID', 'thm');

  return sheet;
}

function getAllAnnualThemes() {
  var sheet = getAnnualThemeSheet();
  var data = sheet.getDataRange().getValues();
  var themes = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var start = parseLooseDate(row[0]);
    var end = parseLooseDate(row[1]);
    var name = String(row[2] || '').trim();
    var color = String(row[3] || '').trim() || '#6366f1';
    var id = String(row[4] || '').trim() || generateStableId('thm');

    if (!start.dateStr || !end.dateStr || !name) continue;

    themes.push({
      sheetRow: i + 1,
      id: id,
      name: name,
      dateStart: start.dateStr,
      dateEnd: end.dateStr,
      color: color,
    });
  }

  return themes;
}

function createAnnualTheme(themeData) {
  var sheet = getAnnualThemeSheet();
  var start = parseLooseDate(themeData.dateStart);
  var end = parseLooseDate(themeData.dateEnd);
  var name = String(themeData.name || '').trim();
  var color = String(themeData.color || '').trim() || '#6366f1';

  if (!start.dateStr || !end.dateStr || !name) {
    return { success: false, error: 'Data tema tahunan tidak lengkap' };
  }
  if (end.dateStr < start.dateStr) {
    return { success: false, error: 'Tanggal selesai tidak boleh sebelum tanggal mulai' };
  }

  var id = String(themeData.id || '').trim() || generateStableId('thm');
  sheet.appendRow([start.dateStr, end.dateStr, name, color, id]);
  return { success: true, row: sheet.getLastRow(), id: id };
}

function updateAnnualTheme(themeData) {
  var sheet = getAnnualThemeSheet();
  var sheetRow = themeData.sheetRow || findRowById(sheet, ANNUAL_THEME_HEADERS, 'ID', themeData.id);
  var start = parseLooseDate(themeData.dateStart);
  var end = parseLooseDate(themeData.dateEnd);
  var name = String(themeData.name || '').trim();
  var color = String(themeData.color || '').trim() || '#6366f1';

  if (!sheetRow || sheetRow < 2) {
    return { success: false, error: 'Invalid annual theme row number' };
  }
  if (!start.dateStr || !end.dateStr || !name) {
    return { success: false, error: 'Data tema tahunan tidak lengkap' };
  }
  if (end.dateStr < start.dateStr) {
    return { success: false, error: 'Tanggal selesai tidak boleh sebelum tanggal mulai' };
  }

  var currentId = String(sheet.getRange(sheetRow, 5).getValue() || '').trim() || String(themeData.id || '').trim() || generateStableId('thm');
  sheet.getRange(sheetRow, 1, 1, ANNUAL_THEME_HEADERS.length).setValues([[start.dateStr, end.dateStr, name, color, currentId]]);
  return { success: true };
}

function deleteAnnualTheme(sheetRow, id) {
  var sheet = getAnnualThemeSheet();
  sheetRow = sheetRow || findRowById(sheet, ANNUAL_THEME_HEADERS, 'ID', id);
  if (!sheetRow || sheetRow < 2) {
    return { success: false, error: 'Invalid annual theme row number' };
  }

  sheet.deleteRow(sheetRow);
  return { success: true };
}

function getLetterFormConfig() {
  var raw = PropertiesService.getScriptProperties().getProperty('LETTER_FORM_CONFIG_JSON');
  if (!raw) return LETTER_FORM_DEFAULT_CONFIG;

  try {
    var parsed = JSON.parse(raw);
    return {
      viewUrl: parsed.viewUrl || LETTER_FORM_DEFAULT_CONFIG.viewUrl,
      responseUrl: parsed.responseUrl || LETTER_FORM_DEFAULT_CONFIG.responseUrl,
      fields: Object.assign({}, LETTER_FORM_DEFAULT_CONFIG.fields, parsed.fields || {})
    };
  } catch (err) {
    throw new Error('LETTER_FORM_CONFIG_JSON tidak valid: ' + err.message);
  }
}

function getLetterFormConfigSummary() {
  var config = getLetterFormConfig();
  return {
    viewUrl: config.viewUrl,
    responseUrl: config.responseUrl,
    fieldKeys: Object.keys(config.fields),
    usingScriptProperties: !!PropertiesService.getScriptProperties().getProperty('LETTER_FORM_CONFIG_JSON')
  };
}

function getSheet() {
  return ensureEventSheet();
}

function getLegacyEventSheet() {
  return getEventSpreadsheet().getSheetByName(LEGACY_EVENT_SHEET_NAME);
}

function maybeAutoMigrateLegacyEvents() {
  var sheet = ensureEventSheet();
  if (sheet.getLastRow() > 1) return;

  var legacySheet = getLegacyEventSheet();
  if (!legacySheet || legacySheet.getLastRow() < 2) return;

  migrateLegacyEventsToNewSheet();
}

function ensureEventSheet() {
  var ss = getEventSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  ensureHeaders(sheet, EVENT_HEADERS);
  ensureStableIds(sheet, EVENT_HEADERS, 'ID', 'evt');
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
  var categories = Array.isArray(value)
    ? value.map(function(item) { return String(item || '').trim(); }).filter(function(item) { return !!item; })
    : (function() {
        var raw = String(value || '').trim();
        return raw
          ? raw.split('|').map(function(item) { return String(item || '').trim(); }).filter(function(item) { return !!item; })
          : [];
      })();

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
    eventData.eventModelNotes || '',
    eventData.pic || '',
    eventData.phone || '',
    String(eventData.id || '').trim() || generateStableId('evt'),
    String(eventData.sourceDraftId || '').trim()
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
      pic: '',
      phone: '',
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
  getDraftSheet();
  getHolidaySheet();
  getAnnualThemeSheet();
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
  ensureStableIds(sheet, EVENT_HEADERS, 'ID', 'evt');

  return {
    success: true,
    sourceSheet: LEGACY_EVENT_SHEET_NAME,
    targetSheet: SHEET_NAME,
    migratedRows: legacyEvents.length,
    totalRows: sheet.getLastRow()
  };
}

function migrateStableIds() {
  var eventSheet = ensureEventSheet();
  var draftSheet = getDraftSheet();
  var holidaySheet = getHolidaySheet();
  var themeSheet = getAnnualThemeSheet();

  ensureStableIds(eventSheet, EVENT_HEADERS, 'ID', 'evt');
  ensureStableIds(draftSheet, DRAFT_HEADERS, 'ID', 'drf');
  ensureStableIds(holidaySheet, HOLIDAY_HEADERS, 'ID', 'hdy');
  ensureStableIds(themeSheet, ANNUAL_THEME_HEADERS, 'ID', 'thm');

  return {
    success: true,
    sheets: {
      events: eventSheet.getLastRow() - 1,
      drafts: draftSheet.getLastRow() - 1,
      holidays: holidaySheet.getLastRow() - 1,
      themes: themeSheet.getLastRow() - 1
    }
  };
}

function getDraftSheet() {
  var ss = getEventSpreadsheet();
  var sheet = ss.getSheetByName(DRAFT_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(DRAFT_SHEET_NAME);
  }

  ensureHeaders(sheet, DRAFT_HEADERS);
  ensureStableIds(sheet, DRAFT_HEADERS, 'ID', 'drf');

  return sheet;
}

function getHolidaySheet() {
  var ss = getEventSpreadsheet();
  var sheet = ss.getSheetByName(HOLIDAY_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(HOLIDAY_SHEET_NAME);
  }

  ensureHeaders(sheet, HOLIDAY_HEADERS);
  ensureStableIds(sheet, HOLIDAY_HEADERS, 'ID', 'hdy');

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
      id: String(row[4] || '').trim(),
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
  maybeAutoMigrateLegacyEvents();
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
      id: String(row[headerMap['ID']] || '').trim(),
      sheetRow: i + 1,
      tanggal: toDisplayTanggal(row[headerMap['Tanggal']], formatted.tanggal),
      dateStr: formatted.dateStr,
      day: toDisplayDay(row[headerMap['Day']], formatted.day),
      jam: String(row[headerMap['Jam']] || '').trim(),
      acara: acara,
      lokasi: String(row[headerMap['Lokasi']] || '').trim(),
      eo: String(row[headerMap['EO']] || '').trim(),
      pic: String(row[headerMap['Penanggung Jawab']] || '').trim(),
      phone: String(row[headerMap['Nomor Handphone']] || '').trim(),
      keterangan: String(row[headerMap['Keterangan']] || '').trim(),
      month: formatted.monthName,
      status: status,
      category: categories[0] || 'Umum',
      categories: categories,
      priority: priority,
      eventModel: eventModel,
      eventNominal: String(row[headerMap['Nominal Event']] || '').trim(),
      eventModelNotes: String(row[headerMap['Keterangan Model Event']] || '').trim(),
      sourceDraftId: String(row[headerMap['Source Draft ID']] || '').trim()
    });
  }

  return { events: events, themes: getAllAnnualThemes(), holidays: getAllHolidays() };
}

// ---- CREATE: Add new event ----

function addEvent(eventData) {
  var sheet = getSheet();
  try {
    var row = getCanonicalEventRow(eventData);
    sheet.appendRow(row);
  } catch (err) {
    return { success: false, error: err.message };
  }

  return { success: true, row: sheet.getLastRow(), id: String(row[16] || '').trim() };
}

// ---- UPDATE: Edit existing event ----

function updateEvent(eventData) {
  var sheet = getSheet();
  var sheetRow = eventData.sheetRow || findRowById(sheet, EVENT_HEADERS, 'ID', eventData.id);
  var headerMap = getEventHeaderMap();

  if (!sheetRow || sheetRow < 2) {
    return { success: false, error: 'Invalid row number' };
  }

  try {
    var current = sheet.getRange(sheetRow, 1, 1, EVENT_HEADERS.length).getValues()[0];
    var currentData = {
      dateStr: String(current[headerMap['Date']] || '').trim(),
      jam: String(current[headerMap['Jam']] || '').trim(),
      acara: String(current[headerMap['Acara']] || '').trim(),
      lokasi: String(current[headerMap['Lokasi']] || '').trim(),
      eo: String(current[headerMap['EO']] || '').trim(),
      pic: String(current[headerMap['Penanggung Jawab']] || '').trim(),
      phone: String(current[headerMap['Nomor Handphone']] || '').trim(),
      keterangan: String(current[headerMap['Keterangan']] || '').trim(),
      status: String(current[headerMap['Status']] || '').trim(),
      categories: parseEventCategories(current[headerMap['Jenis Acara']], 'Umum'),
      category: parseEventCategories(current[headerMap['Jenis Acara']], 'Umum')[0],
      priority: String(current[headerMap['Prioritas']] || '').trim(),
      eventModel: String(current[headerMap['Model Event']] || '').trim(),
      eventNominal: String(current[headerMap['Nominal Event']] || '').trim(),
      eventModelNotes: String(current[headerMap['Keterangan Model Event']] || '').trim(),
      id: String(current[headerMap['ID']] || '').trim(),
      sourceDraftId: String(current[headerMap['Source Draft ID']] || '').trim()
    };
    sheet.getRange(sheetRow, 1, 1, EVENT_HEADERS.length).setValues([getCanonicalEventRow(Object.assign({}, currentData, eventData))]);
  } catch (err) {
    return { success: false, error: err.message };
  }

  return { success: true };
}

// ---- DELETE: Remove event ----

function deleteEvent(sheetRow) {
  var sheet = getSheet();
  var id = arguments.length > 1 ? arguments[1] : '';
  sheetRow = sheetRow || findRowById(sheet, EVENT_HEADERS, 'ID', id);

  if (!sheetRow || sheetRow < 2) {
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

    var categories = parseEventCategories(row[9], detectEventCategory(acara));
    var priority = String(row[10] || '').trim().toLowerCase();
    if (priority !== 'high' && priority !== 'medium' && priority !== 'low') {
      priority = 'medium';
    }
    var eventModel = String(row[11] || '').trim().toLowerCase();
    if (eventModel !== 'free' && eventModel !== 'bayar' && eventModel !== 'support') {
      eventModel = '';
    }

    var publishedRaw = row[15];
    var published = publishedRaw === true || String(publishedRaw).toLowerCase() === 'true';
    var publishedAt = row[16] instanceof Date ? row[16].toISOString() : String(row[16] || '');
    var deletedRaw = row[17];
    var deleted = deletedRaw === true || String(deletedRaw).toLowerCase() === 'true';
    var deletedAt = row[18] instanceof Date ? row[18].toISOString() : String(row[18] || '');

    drafts.push({
      id: String(row[19] || '').trim(),
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
      internalNote: String(row[8] || '').trim(),
      month: formatted.monthName,
      category: categories[0] || detectEventCategory(acara),
      categories: categories,
      priority: priority,
      eventModel: eventModel,
      eventNominal: String(row[12] || '').trim(),
      eventModelNotes: String(row[13] || '').trim(),
      progress: String(row[14] || 'draft').trim().toLowerCase() || 'draft',
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
  var id = String(draftData.id || '').trim() || generateStableId('drf');

  sheet.appendRow([
    draftDate,
    draftData.jam || '',
    draftData.acara || '',
    draftData.lokasi || '',
    draftData.eo || '',
    draftData.pic || '',
    draftData.phone || '',
    draftData.keterangan || '',
    draftData.internalNote || '',
    stringifyEventCategories(draftData.categories, draftData.category),
    draftData.priority || 'medium',
    draftData.eventModel || '',
    draftData.eventNominal || '',
    draftData.eventModelNotes || '',
    draftData.progress || 'draft',
    false,
    '',
    false,
    '',
    id
  ]);

  return { success: true, row: insertRow, id: id };
}

function updateDraftEvent(draftData) {
  var sheet = getDraftSheet();
  var sheetRow = draftData.sheetRow || findRowById(sheet, DRAFT_HEADERS, 'ID', draftData.id);
  var hasOwn = Object.prototype.hasOwnProperty;

  if (!sheetRow || sheetRow < 2) {
    return { success: false, error: 'Invalid draft row number' };
  }

  var current = sheet.getRange(sheetRow, 1, 1, 20).getValues()[0];
  var parts = String(draftData.dateStr || '').split('-');
  var draftDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));

  sheet.getRange(sheetRow, 1, 1, 20).setValues([[
    draftDate,
    hasOwn.call(draftData, 'jam') ? draftData.jam : (current[1] || ''),
    hasOwn.call(draftData, 'acara') ? draftData.acara : (current[2] || ''),
    hasOwn.call(draftData, 'lokasi') ? draftData.lokasi : (current[3] || ''),
    hasOwn.call(draftData, 'eo') ? draftData.eo : (current[4] || ''),
    hasOwn.call(draftData, 'pic') ? draftData.pic : (current[5] || ''),
    hasOwn.call(draftData, 'phone') ? draftData.phone : (current[6] || ''),
    hasOwn.call(draftData, 'keterangan') ? draftData.keterangan : (current[7] || ''),
    hasOwn.call(draftData, 'internalNote') ? draftData.internalNote : (current[8] || ''),
    stringifyEventCategories(
      hasOwn.call(draftData, 'categories') ? draftData.categories : parseEventCategories(current[9], detectEventCategory(hasOwn.call(draftData, 'acara') ? draftData.acara : current[2])),
      hasOwn.call(draftData, 'category') ? draftData.category : parseEventCategories(current[9], detectEventCategory(hasOwn.call(draftData, 'acara') ? draftData.acara : current[2]))[0]
    ),
    hasOwn.call(draftData, 'priority') ? draftData.priority : (current[10] || 'medium'),
    hasOwn.call(draftData, 'eventModel') ? draftData.eventModel : (current[11] || ''),
    hasOwn.call(draftData, 'eventNominal') ? draftData.eventNominal : (current[12] || ''),
    hasOwn.call(draftData, 'eventModelNotes') ? draftData.eventModelNotes : (current[13] || ''),
    hasOwn.call(draftData, 'progress') ? draftData.progress : (current[14] || 'draft'),
    typeof draftData.published === 'boolean' ? draftData.published : current[15],
    hasOwn.call(draftData, 'publishedAt') ? draftData.publishedAt : (current[16] || ''),
    typeof draftData.deleted === 'boolean' ? draftData.deleted : current[17],
    hasOwn.call(draftData, 'deletedAt') ? draftData.deletedAt : (current[18] || ''),
    hasOwn.call(draftData, 'id') ? draftData.id : (current[19] || '')
  ]]);

  return { success: true };
}

function deleteDraftEvent(sheetRow, id) {
  var sheet = getDraftSheet();
  sheetRow = sheetRow || findRowById(sheet, DRAFT_HEADERS, 'ID', id);

  if (!sheetRow || sheetRow < 2) {
    return { success: false, error: 'Invalid draft row number' };
  }

  var row = sheet.getRange(sheetRow, 1, 1, 20).getValues()[0];
  var existingNote = String(row[8] || '').trim();
  var deletedAt = new Date();
  var deletedNote = 'Dihapus admin pada ' + Utilities.formatDate(deletedAt, Session.getScriptTimeZone(), 'dd MMM yyyy HH:mm');
  var nextNote = existingNote ? existingNote + ' | ' + deletedNote : deletedNote;

  sheet.getRange(sheetRow, 9).setValue(nextNote);
  sheet.getRange(sheetRow, 15).setValue('cancel');
  sheet.getRange(sheetRow, 18).setValue(true);
  sheet.getRange(sheetRow, 19).setValue(deletedAt);
  return { success: true };
}

function publishDraftEvent(sheetRow, id) {
  var sheet = getDraftSheet();
  sheetRow = sheetRow || findRowById(sheet, DRAFT_HEADERS, 'ID', id);

  if (!sheetRow || sheetRow < 2) {
    return { success: false, error: 'Invalid draft row number' };
  }

  var drafts = getAllDraftEvents();
  var draft = drafts.filter(function(item) { return item.sheetRow === sheetRow; })[0];

  if (!draft) {
    return { success: false, error: 'Draft event tidak ditemukan' };
  }

  if (!draft.dateStr || !String(draft.acara || '').trim()) {
    return { success: false, error: 'Draft event data is incomplete' };
  }
  if (draft.progress !== 'confirm') {
    return { success: false, error: 'Draft harus berstatus confirm sebelum dipublish' };
  }
  var eventSheet = getSheet();
  var eventHeaderMap = getEventHeaderMap();
  var existingEvents = eventSheet.getLastRow() > 1
    ? eventSheet.getRange(2, eventHeaderMap['Source Draft ID'] + 1, eventSheet.getLastRow() - 1, 1).getValues()
    : [];
  var existingRow = 0;
  for (var i = 0; i < existingEvents.length; i++) {
    if (String(existingEvents[i][0] || '').trim() === draft.id) {
      existingRow = i + 2;
      break;
    }
  }

  if (draft.published || existingRow) {
    if (!draft.published) {
      sheet.getRange(sheetRow, 15).setValue('confirm');
      sheet.getRange(sheetRow, 16).setValue(true);
      if (!sheet.getRange(sheetRow, 17).getValue()) {
        sheet.getRange(sheetRow, 17).setValue(new Date());
      }
    }
    var existingEventId = existingRow ? String(eventSheet.getRange(existingRow, eventHeaderMap['ID'] + 1).getValue() || '').trim() : '';
    return { success: true, row: existingRow || '', id: existingEventId };
  }
  if (draft.deleted) {
    return { success: false, error: 'Draft ini sudah dihapus dan masuk riwayat' };
  }

  var publishResult = addEvent({
    dateStr: draft.dateStr,
    jam: draft.jam,
    acara: draft.acara,
    lokasi: draft.lokasi,
    eo: draft.eo,
    pic: draft.pic,
    phone: draft.phone,
    keterangan: draft.keterangan,
    category: draft.category,
    categories: draft.categories,
    priority: draft.priority,
    eventModel: draft.eventModel,
    eventNominal: draft.eventNominal,
    eventModelNotes: draft.eventModelNotes,
    sourceDraftId: draft.id
  });

  if (!publishResult.success) {
    return publishResult;
  }

  sheet.getRange(sheetRow, 15).setValue('confirm');
  sheet.getRange(sheetRow, 16).setValue(true);
  sheet.getRange(sheetRow, 17).setValue(new Date());

  return { success: true, row: publishResult.row };
}

function restoreDraftEvent(sheetRow, id) {
  var sheet = getDraftSheet();
  sheetRow = sheetRow || findRowById(sheet, DRAFT_HEADERS, 'ID', id);

  if (!sheetRow || sheetRow < 2) {
    return { success: false, error: 'Invalid draft row number' };
  }

  var row = sheet.getRange(sheetRow, 1, 1, 20).getValues()[0];
  var published = row[15] === true || String(row[15]).toLowerCase() === 'true';

  if (published) {
    return { success: false, error: 'Draft yang sudah dipublish tidak bisa dipulihkan' };
  }

  var existingNote = String(row[8] || '').trim();
  var restoredAt = new Date();
  var restoredNote = 'Dipulihkan admin pada ' + Utilities.formatDate(restoredAt, Session.getScriptTimeZone(), 'dd MMM yyyy HH:mm');
  var nextNote = existingNote ? existingNote + ' | ' + restoredNote : restoredNote;

  sheet.getRange(sheetRow, 9).setValue(nextNote);
  sheet.getRange(sheetRow, 15).setValue('draft');
  sheet.getRange(sheetRow, 18).setValue(false);
  sheet.getRange(sheetRow, 19).setValue('');

  return { success: true };
}

function extractGoogleFormHiddenField(html, name) {
  var regex = new RegExp('<input[^>]+name=["\']' + name + '["\'][^>]+value=["\']([^"\']*)["\']', 'i');
  var match = html.match(regex);
  return match ? match[1] : '';
}

function createLetterRequest(data) {
  var formConfig = getLetterFormConfig();
  var viewResponse = UrlFetchApp.fetch(formConfig.viewUrl, {
    method: 'get',
    muteHttpExceptions: true,
    followRedirects: true,
  });
  var viewCode = viewResponse.getResponseCode();
  if (viewCode < 200 || viewCode >= 400) {
    return { success: false, error: 'Gagal membuka Google Form surat (' + viewCode + ')' };
  }

  var html = viewResponse.getContentText();
  var fbzx = extractGoogleFormHiddenField(html, 'fbzx');
  var partialResponse = extractGoogleFormHiddenField(html, 'partialResponse');

  if (!fbzx || !partialResponse) {
    return { success: false, error: 'Hidden field Google Form tidak ditemukan' };
  }

  var payload = {
    'fvv': extractGoogleFormHiddenField(html, 'fvv') || '1',
    'pageHistory': extractGoogleFormHiddenField(html, 'pageHistory') || '0',
    'partialResponse': partialResponse,
    'fbzx': fbzx,
    'submissionTimestamp': extractGoogleFormHiddenField(html, 'submissionTimestamp') || '-1'
  };

  Object.keys(formConfig.fields).forEach(function(fieldKey) {
    payload[formConfig.fields[fieldKey]] = data[fieldKey] || '';
  });

  var submitResponse = UrlFetchApp.fetch(formConfig.responseUrl, {
    method: 'post',
    payload: payload,
    contentType: 'application/x-www-form-urlencoded',
    muteHttpExceptions: true,
    followRedirects: false,
  });
  var submitCode = submitResponse.getResponseCode();
  if (submitCode >= 200 && submitCode < 400) {
    return { success: true };
  }

  return {
    success: false,
    error: 'Google Form surat menolak request (' + submitCode + ')'
  };
}

function authorizeUrlFetch() {
  UrlFetchApp.fetch('https://www.google.com', {
    method: 'get',
    muteHttpExceptions: true,
  });
  return 'UrlFetchApp authorized';
}

function getAdminApiToken() {
  return String(PropertiesService.getScriptProperties().getProperty('ADMIN_API_TOKEN') || '').trim();
}

function getPublicSubmitToken() {
  return String(PropertiesService.getScriptProperties().getProperty('PUBLIC_SUBMIT_TOKEN') || '').trim();
}

function isMutationAction(action) {
  return [
    'create', 'update', 'delete',
    'createTheme', 'updateTheme', 'deleteTheme',
    'createDraft', 'updateDraft', 'deleteDraft', 'publishDraft', 'restoreDraft',
    'createLetterRequest',
    'bootstrapEventSheet', 'migrateLegacyEvents', 'migrateStableIds'
  ].indexOf(action) !== -1;
}

function isAdminProtectedAction(action) {
  return action === 'readDrafts';
}

function isPublicMutationAction(action) {
  return action === 'createDraft';
}

function authorizeRequest(action, token) {
  if (!isMutationAction(action) && !isAdminProtectedAction(action)) return;

  var expectedToken = isPublicMutationAction(action)
    ? getPublicSubmitToken()
    : getAdminApiToken();

  if (!expectedToken) {
    throw new Error((isPublicMutationAction(action) ? 'PUBLIC_SUBMIT_TOKEN' : 'ADMIN_API_TOKEN') + ' belum dikonfigurasi di Script Properties');
  }

  if (String(token || '').trim() !== expectedToken) {
    throw new Error('Unauthorized mutation request');
  }
}

// ---- Web App Handlers ----

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'read';
  var output = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);

  try {
    authorizeRequest(action, e && e.parameter ? e.parameter.token : '');

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
      return output.setContent(JSON.stringify(deleteEvent(deleteRow, e.parameter.id || '')));
    }

    if (action === 'createTheme') {
      var createThemeData = JSON.parse(e.parameter.data || '{}');
      return output.setContent(JSON.stringify(createAnnualTheme(createThemeData)));
    }

    if (action === 'updateTheme') {
      var updateThemeData = JSON.parse(e.parameter.data || '{}');
      return output.setContent(JSON.stringify(updateAnnualTheme(updateThemeData)));
    }

    if (action === 'deleteTheme') {
      var deleteThemeRow = parseInt(e.parameter.sheetRow || '0', 10);
      return output.setContent(JSON.stringify(deleteAnnualTheme(deleteThemeRow, e.parameter.id || '')));
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
      return output.setContent(JSON.stringify(deleteDraftEvent(deleteDraftRow, e.parameter.id || '')));
    }

    if (action === 'publishDraft') {
      var publishDraftRow = parseInt(e.parameter.sheetRow || '0', 10);
      return output.setContent(JSON.stringify(publishDraftEvent(publishDraftRow, e.parameter.id || '')));
    }

    if (action === 'restoreDraft') {
      var restoreDraftRow = parseInt(e.parameter.sheetRow || '0', 10);
      return output.setContent(JSON.stringify(restoreDraftEvent(restoreDraftRow, e.parameter.id || '')));
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

    if (action === 'migrateStableIds') {
      return output.setContent(JSON.stringify(migrateStableIds()));
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
        annualThemeSheetName: THEME_SHEET_NAME,
        eventHeaders: EVENT_HEADERS,
        letterFormConfig: getLetterFormConfigSummary(),
        authConfig: {
          adminTokenConfigured: !!getAdminApiToken(),
          publicSubmitTokenConfigured: !!getPublicSubmitToken(),
        },
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

    authorizeRequest(action, body.token || '');

    if (action === 'readDrafts') {
      return output.setContent(JSON.stringify({ success: true, data: getAllDraftEvents() }));
    }

    if (action === 'create') {
      return output.setContent(JSON.stringify(addEvent(body.data)));
    }
    if (action === 'update') {
      return output.setContent(JSON.stringify(updateEvent(body.data)));
    }
    if (action === 'delete') {
      return output.setContent(JSON.stringify(deleteEvent(body.sheetRow, body.id || '')));
    }
    if (action === 'createTheme') {
      return output.setContent(JSON.stringify(createAnnualTheme(body.data)));
    }
    if (action === 'updateTheme') {
      return output.setContent(JSON.stringify(updateAnnualTheme(body.data)));
    }
    if (action === 'deleteTheme') {
      return output.setContent(JSON.stringify(deleteAnnualTheme(body.sheetRow, body.id || '')));
    }

    if (action === 'createDraft') {
      return output.setContent(JSON.stringify(addDraftEvent(body.data)));
    }
    if (action === 'updateDraft') {
      return output.setContent(JSON.stringify(updateDraftEvent(body.data)));
    }
    if (action === 'deleteDraft') {
      return output.setContent(JSON.stringify(deleteDraftEvent(body.sheetRow, body.id || '')));
    }
    if (action === 'publishDraft') {
      return output.setContent(JSON.stringify(publishDraftEvent(body.sheetRow, body.id || '')));
    }
    if (action === 'restoreDraft') {
      return output.setContent(JSON.stringify(restoreDraftEvent(body.sheetRow, body.id || '')));
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
    if (action === 'migrateStableIds') {
      return output.setContent(JSON.stringify(migrateStableIds()));
    }

    return output.setContent(JSON.stringify({ success: false, error: 'Unknown action: ' + action }));
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}
