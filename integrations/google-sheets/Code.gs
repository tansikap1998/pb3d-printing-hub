/**
 * PB3D backend on Google Sheets (Google Apps Script web app).
 *
 * The website's server (never the browser) POSTs { secret, action, ... } here.
 * Data lives in tabs of this spreadsheet:
 *   Orders    – one row per order
 *   Products  – Shopee product links shown on the home page
 *   Consent   – cookie consent log (PDPA)
 * Payment slips are files in a private Google Drive folder ("PB3D Payment Slips").
 *
 * Columns are found by their title in row 1, so you may reorder columns or add
 * your own columns. Do not rename the titles listed below.
 *
 * Setup: see README.md in this folder. The secret lives in
 * Project Settings → Script properties → WEBHOOK_SECRET (never in this file).
 */

var TABLES = {
  orders: {
    sheet: 'Orders',
    cols: [
      ['id', 'Order ID'],
      ['created_at', 'วันที่สั่ง'],
      ['status', 'สถานะ'],
      ['customer_name', 'ชื่อลูกค้า'],
      ['customer_phone', 'เบอร์โทร'],
      ['customer_email', 'อีเมล'],
      ['customer_address', 'ที่อยู่'],
      ['file_name', 'ไฟล์'],
      ['technology', 'เทคโนโลยี'],
      ['material', 'วัสดุ'],
      ['color', 'สี'],
      ['quantity', 'จำนวน'],
      ['infill', 'Infill (%)'],
      ['layer_height', 'Layer (mm)'],
      ['notes', 'หมายเหตุ'],
      ['volume_cm3', 'ปริมาตร (cm³)'],
      ['weight_g', 'น้ำหนัก (g)'],
      ['print_time_min', 'เวลาพิมพ์ (นาที)'],
      ['base_price', 'ราคาชิ้นงาน (บาท)'],
      ['total_price', 'ยอดรวม (บาท)'],
      ['tracking_number', 'เลขพัสดุ'],
      ['slip_file_id', 'สลิป (Drive file ID)'],
      ['updated_at', 'อัปเดตล่าสุด'],
    ],
    numbers: ['quantity', 'infill', 'layer_height', 'volume_cm3', 'weight_g', 'print_time_min', 'base_price', 'total_price'],
  },
  products: {
    sheet: 'Products',
    cols: [
      ['id', 'Product ID'],
      ['created_at', 'วันที่เพิ่ม'],
      ['name', 'ชื่อสินค้า'],
      ['url', 'ลิงก์ Shopee'],
      ['price', 'ราคา (บาท)'],
      ['image_url', 'ลิงก์รูป'],
      ['description', 'คำอธิบาย'],
      ['active', 'แสดงบนเว็บ'],
      ['sort_order', 'ลำดับ'],
    ],
    numbers: ['price', 'sort_order'],
    booleans: ['active'],
  },
  consent: {
    sheet: 'Consent',
    cols: [
      ['created_at', 'เวลา'],
      ['necessary', 'จำเป็น'],
      ['analytics', 'Analytics'],
      ['marketing', 'Marketing'],
      ['user_agent', 'User agent'],
    ],
    booleans: ['necessary', 'analytics', 'marketing'],
  },
};

var ORDER_STATUSES = ['pending', 'awaiting_verification', 'confirmed', 'printing', 'shipped', 'delivered', 'cancelled'];
var SLIP_FOLDER_NAME = 'PB3D Payment Slips';

// ─── Entry points ────────────────────────────────────────────────────────────

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply_({ ok: false, error: 'bad json' });
  }
  var secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
  if (!secret || !body || body.secret !== secret) return reply_({ ok: false, error: 'unauthorized' });

  var fn = ACTIONS[body.action];
  if (!fn) return reply_({ ok: false, error: 'unknown action' });

  var write = WRITE_ACTIONS[body.action];
  var lock = write ? LockService.getScriptLock() : null;
  if (lock) lock.waitLock(25000); // writes are serialized: no duplicate rows, no lost updates
  try {
    var result = fn(body);
    result.ok = result.ok !== false;
    return reply_(result);
  } catch (err) {
    return reply_({ ok: false, error: String(err && err.message || err) });
  } finally {
    if (lock) lock.releaseLock();
  }
}

/** Opening the web app URL in a browser just confirms it is deployed. */
function doGet() {
  return reply_({ ok: true, service: 'pb3d-sheets-backend' });
}

var ACTIONS = {
  ping: function () { return {}; },

  // ── orders ──
  'orders.create': function (b) {
    var t = table_('orders');
    if (!b.order || !b.order.id) return { ok: false, error: 'missing order' };
    if (findRow_(t, b.order.id) !== -1) return { ok: false, error: 'duplicate id' };
    var o = assign_({}, b.order, { updated_at: b.now || b.order.created_at || '' });
    writeRow_(t, t.sheet.getLastRow() + 1, o);
    return { order: o };
  },
  'orders.get': function (b) {
    var t = table_('orders');
    var r = findRow_(t, b.id);
    return { order: r === -1 ? null : readRow_(t, r) };
  },
  'orders.list': function () {
    var rows = readAll_(table_('orders'));
    rows.sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
    return { orders: rows };
  },
  // patch fields; with ifStatusIn the update only happens when the current status is listed
  'orders.update': function (b) {
    var t = table_('orders');
    var r = findRow_(t, b.id);
    if (r === -1) return { order: null };
    var cur = readRow_(t, r);
    if (b.ifStatusIn && b.ifStatusIn.indexOf(cur.status) === -1) return { order: null, conflict: true, status: cur.status };
    if (b.patch && b.patch.status && ORDER_STATUSES.indexOf(b.patch.status) === -1) return { ok: false, error: 'bad status' };
    var o = assign_(cur, b.patch || {}, { id: cur.id, updated_at: b.now || '' });
    writeRow_(t, r, o);
    return { order: o };
  },
  // store the slip file and mark the order as paid, in one locked step
  'orders.submitSlip': function (b) {
    var t = table_('orders');
    var r = findRow_(t, b.id);
    if (r === -1) return { order: null };
    var cur = readRow_(t, r);
    if (cur.status !== 'pending' && cur.status !== 'awaiting_verification') return { order: null, conflict: true, status: cur.status };
    var blob = Utilities.newBlob(Utilities.base64Decode(b.base64), b.mimeType, cur.id + '-' + Date.now() + '.' + b.ext);
    var file = slipFolder_().createFile(blob);
    var o = assign_(cur, { status: 'awaiting_verification', slip_file_id: file.getId(), updated_at: b.now || '' });
    writeRow_(t, r, o);
    return { order: o };
  },
  // migration: attach an existing slip file without touching the status
  'slips.attach': function (b) {
    var t = table_('orders');
    var r = findRow_(t, b.id);
    if (r === -1) return { order: null };
    var cur = readRow_(t, r);
    var blob = Utilities.newBlob(Utilities.base64Decode(b.base64), b.mimeType, cur.id + '-imported.' + b.ext);
    var o = assign_(cur, { slip_file_id: slipFolder_().createFile(blob).getId() });
    writeRow_(t, r, o);
    return { order: o };
  },
  'slips.get': function (b) {
    var t = table_('orders');
    var r = findRow_(t, b.orderId);
    if (r === -1) return { slip: null };
    var fileId = readRow_(t, r).slip_file_id;
    if (!fileId) return { slip: null };
    var blob = DriveApp.getFileById(fileId).getBlob();
    return { slip: { mimeType: blob.getContentType(), name: blob.getName(), base64: Utilities.base64Encode(blob.getBytes()) } };
  },
  // one-off import (migration from Supabase): insert or update by id
  'orders.import': function (b) {
    var t = table_('orders');
    var rows = (b.orders || []).map(function (o) {
      if (!o || !o.id) throw new Error('missing order id');
      var r = findRow_(t, o.id);
      var merged = r === -1 ? o : assign_(readRow_(t, r), o);
      var at = r === -1 ? t.sheet.getLastRow() + 1 : r;
      writeRow_(t, at, merged);
      return at;
    });
    return { rows: rows };
  },

  // ── products ──
  'products.list': function (b) {
    var rows = readAll_(table_('products'));
    if (b.activeOnly) rows = rows.filter(function (p) { return p.active === true; });
    rows.sort(function (a, c) {
      return (Number(a.sort_order) || 0) - (Number(c.sort_order) || 0) || String(c.created_at).localeCompare(String(a.created_at));
    });
    return { products: rows };
  },
  'products.create': function (b) {
    var t = table_('products');
    if (!b.product || !b.product.id) return { ok: false, error: 'missing product' };
    writeRow_(t, t.sheet.getLastRow() + 1, b.product);
    return { product: b.product };
  },
  'products.update': function (b) {
    var t = table_('products');
    var r = findRow_(t, b.id);
    if (r === -1) return { product: null };
    var p = assign_(readRow_(t, r), b.patch || {}, { id: b.id });
    writeRow_(t, r, p);
    return { product: p };
  },
  'products.delete': function (b) {
    var t = table_('products');
    var r = findRow_(t, b.id);
    if (r === -1) return { deleted: false };
    t.sheet.deleteRow(r);
    return { deleted: true };
  },

  // ── consent ──
  'consent.add': function (b) {
    var t = table_('consent');
    writeRow_(t, t.sheet.getLastRow() + 1, b.entry || {});
    return {};
  },
};

var WRITE_ACTIONS = {
  'orders.create': 1, 'orders.update': 1, 'orders.submitSlip': 1, 'orders.import': 1, 'slips.attach': 1,
  'products.create': 1, 'products.update': 1, 'products.delete': 1, 'consent.add': 1,
};

// ─── Table helpers ───────────────────────────────────────────────────────────

/** Open (or create) the tab and map each key to its column by title. */
function table_(name) {
  var def = TABLES[name];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(def.sheet);
  var created = false;
  if (!sheet) { sheet = ss.insertSheet(def.sheet); created = true; }

  var width = Math.max(sheet.getLastColumn(), 1);
  var titles = sheet.getLastRow() >= 1 ? sheet.getRange(1, 1, 1, width).getValues()[0].map(String) : [];
  var col = {};
  def.cols.forEach(function (c) {
    var i = titles.indexOf(c[1]);
    if (i === -1) { // missing column → add it on the right
      titles.push(c[1]);
      i = titles.length - 1;
      sheet.getRange(1, i + 1).setValue(c[1]).setFontWeight('bold');
    }
    col[c[0]] = i + 1;
  });
  if (created) {
    sheet.setFrozenRows(1);
    if (name === 'orders') {
      var rule = SpreadsheetApp.newDataValidation().requireValueInList(ORDER_STATUSES, true).setAllowInvalid(false).build();
      sheet.getRange(2, col.status, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
    }
  }
  return { def: def, sheet: sheet, col: col, width: titles.length };
}

function findRow_(t, id) {
  var last = t.sheet.getLastRow();
  if (last < 2 || !id) return -1;
  var ids = t.sheet.getRange(2, t.col.id, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function readRow_(t, r) {
  return toObj_(t, t.sheet.getRange(r, 1, 1, t.width).getValues()[0]);
}

function readAll_(t) {
  var last = t.sheet.getLastRow();
  if (last < 2) return [];
  return t.sheet.getRange(2, 1, last - 1, t.width).getValues()
    .map(function (row) { return toObj_(t, row); })
    .filter(function (o) { return o.id !== '' || !t.col.id; });
}

function toObj_(t, row) {
  var o = {};
  t.def.cols.forEach(function (c) {
    var v = row[t.col[c[0]] - 1];
    if (v instanceof Date) v = v.toISOString();
    if (isIn_(t.def.booleans, c[0])) v = v === true || String(v).toUpperCase() === 'TRUE';
    else if (isIn_(t.def.numbers, c[0])) v = v === '' || v === null ? null : Number(v);
    else v = v === null || v === undefined ? '' : String(v);
    o[c[0]] = v;
  });
  return o;
}

/** Write the known columns of row r, keeping any extra columns the owner added. */
function writeRow_(t, r, obj) {
  var existing = r <= t.sheet.getLastRow() ? t.sheet.getRange(r, 1, 1, t.width).getValues()[0] : [];
  var row = [];
  for (var i = 0; i < t.width; i++) row.push(existing[i] === undefined ? '' : existing[i]);
  t.def.cols.forEach(function (c) {
    if (obj[c[0]] !== undefined) row[t.col[c[0]] - 1] = cell_(t.def, c[0], obj[c[0]]);
  });
  t.sheet.getRange(r, 1, 1, t.width).setValues([row]);
}

/**
 * Numbers and booleans are stored as such. Every text value gets a leading
 * apostrophe: Sheets then keeps it as plain text (no lost leading zeros, no
 * date guessing) and customer-typed text can never run as a formula.
 * The apostrophe itself is not part of the stored value.
 */
function cell_(def, key, v) {
  if (v === null || v === undefined || v === '') return '';
  if (isIn_(def.booleans, key)) return v === true || String(v).toUpperCase() === 'TRUE';
  if (isIn_(def.numbers, key) && !isNaN(Number(v))) return Number(v);
  return "'" + String(v);
}

function slipFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SLIP_FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* deleted → create a new one */ }
  }
  var folder = DriveApp.createFolder(SLIP_FOLDER_NAME); // private: only the owner can open it
  props.setProperty('SLIP_FOLDER_ID', folder.getId());
  return folder;
}

function isIn_(list, key) { return !!list && list.indexOf(key) !== -1; }

function assign_(target) {
  for (var i = 1; i < arguments.length; i++) {
    var src = arguments[i];
    for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
  }
  return target;
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
