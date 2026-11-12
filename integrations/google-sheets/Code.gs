/**
 * PB3D → Google Sheets order mirror (Google Apps Script web app).
 *
 * The website POSTs { secret, order } here whenever an order is created or
 * changes (slip received, status, tracking number). One row per order: an
 * existing row with the same Order ID is updated, otherwise a row is added.
 *
 * Setup: see README.md in this folder. The secret lives in
 * Project Settings → Script properties → WEBHOOK_SECRET (never in this file).
 */

var SHEET_NAME = 'Orders';

// [key sent by the website, column title]. Column A must stay the Order ID.
var HEADERS = [
  ['id', 'Order ID'],
  ['created_at', 'วันที่สั่ง'],
  ['status', 'สถานะ'],
  ['customer_name', 'ชื่อลูกค้า'],
  ['customer_phone', 'เบอร์โทร'],
  ['customer_email', 'อีเมล'],
  ['customer_address', 'ที่อยู่'],
  ['file_name', 'ไฟล์'],
  ['material', 'วัสดุ'],
  ['color', 'สี'],
  ['quantity', 'จำนวน'],
  ['infill', 'Infill (%)'],
  ['layer_height', 'Layer (mm)'],
  ['notes', 'หมายเหตุ'],
  ['total_price', 'ยอดรวม (บาท)'],
  ['tracking_number', 'เลขพัสดุ'],
  ['has_slip', 'สลิป'],
  ['updated_at', 'อัปเดตล่าสุด'],
];
var NUMBER_KEYS = { quantity: true, infill: true, layer_height: true, total_price: true };

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply_({ ok: false, error: 'bad json' });
  }
  var secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
  if (!secret || !body || body.secret !== secret) return reply_({ ok: false, error: 'unauthorized' });
  // { order } for live updates, { orders: [...] } for the admin "sync all" button
  var orders = body.orders || (body.order ? [body.order] : []);
  if (!orders.length || orders.some(function (o) { return !o || !o.id; }))
    return reply_({ ok: false, error: 'missing order' });

  var lock = LockService.getScriptLock();
  lock.waitLock(20000); // two updates for the same order must not both append a row
  try {
    var rows = orders.map(upsertOrder_);
    return reply_({ ok: true, rows: rows });
  } finally {
    lock.releaseLock();
  }
}

/** Visiting the URL in a browser just confirms the script is deployed. */
function doGet() {
  return reply_({ ok: true, service: 'pb3d-orders-sheet' });
}

function upsertOrder_(order) {
  var sheet = getSheet_();
  var values = HEADERS.map(function (h) { return cell_(h[0], order[h[0]]); });

  var last = sheet.getLastRow();
  var rowIndex = -1;
  if (last >= 2) {
    var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(order.id)) { rowIndex = i + 2; break; }
    }
  }
  if (rowIndex === -1) rowIndex = last + 1;
  sheet.getRange(rowIndex, 1, 1, values.length).setValues([values]);
  return rowIndex;
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setValues([HEADERS.map(function (h) { return h[1]; })])
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
    // keep phone numbers, ids etc. as text (no lost leading zeros, no date guessing)
    HEADERS.forEach(function (h, i) {
      if (!NUMBER_KEYS[h[0]]) sheet.getRange(2, i + 1, sheet.getMaxRows() - 1, 1).setNumberFormat('@');
    });
  }
  return sheet;
}

/**
 * Customer-typed text must never become a formula (=HYPERLINK(...), =IMPORTXML(...)).
 * Text that starts with = + - @ or a tab/CR is prefixed with an apostrophe.
 */
function cell_(key, v) {
  if (v === null || v === undefined) return '';
  if (NUMBER_KEYS[key] && v !== '' && !isNaN(Number(v))) return Number(v);
  var s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return s;
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
