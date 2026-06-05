/*
檔案位置：HisBridgeService.js
時間戳記：2026-06-06 03:23 UTC+8
用途：HIS Bridge 後端服務；集中管理 HIS/EIP hidden form bridge 設定、產生 Excel 提取 bridge HTML，避免敏感資訊暴露於公開前端。
*/

const HIS_BRIDGE_CONFIG_KEYS = [
  'HIS_BRIDGE_ACTION_URL',
  'HIS_BRIDGE_METHOD',
  'HIS_BRIDGE_PROJECT',
  'HIS_BRIDGE_USER_ID',
  'HIS_BRIDGE_CODE_PAGE',
  'HIS_BRIDGE_LANGUAGE',
  'HIS_BRIDGE_PREV_PAGE',
  'HIS_BRIDGE_COM_FILE',
  'HIS_BRIDGE_QUERYTABLE',
  'HIS_EXCEL_ACTION_URL',
  'HIS_EXCEL_METHOD',
  'HIS_EXCEL_URI',
  'HIS_EXCEL_AUTO_SUBMIT',
  'HIS_EXCEL_AUTO_CLOSE_MS',
  'HIS_EXCEL_TARGET_MODE',
  'HIS_BRIDGE_DEBUG'
];

function buildHisExcelBridge(payload){
  payload = payload || {};
  const merged = Object.assign(
    {},
    payload,
    {
      mode:'excel-export'
    }
  );

  return buildHisBridge(merged);
}

function buildHisBridge(payload){
  payload = payload || {};
  const mode = String(payload.mode || '').trim();

  if(mode !== 'excel-export'){
    return {
      ok:false,
      code:'HIS_BRIDGE_UNSUPPORTED_MODE',
      message:'不支援的 HIS Bridge mode'
    };
  }

  const config = getHisBridgeConfig_();

  if(!isHisExcelBridgeConfigured_(config)){
    return {
      ok:false,
      code:'HIS_EXCEL_BRIDGE_NOT_CONFIGURED',
      message:'尚未設定 HIS Excel Bridge'
    };
  }

  return {
    ok:true,
    mode:'html',
    html:buildHisExcelBridgeHtml_(config, payload),
    message:'HIS Excel Bridge 已建立'
  };
}

function getHisBridgeConfig_(){
  const config = {};
  let props = null;

  try{
    props = PropertiesService
      .getScriptProperties()
      .getProperties();
  }
  catch(error){
    props = {};
  }

  HIS_BRIDGE_CONFIG_KEYS.forEach(function(key){
    config[key] = String(props[key] || '').trim();
  });

  /*
    HIS bridge sensitive config：不可搬到公開前端。
    若 Script Properties 尚未設定，本區只保留空值，讓 buildHisBridge 安全失敗。
  */
  config.HIS_BRIDGE_METHOD = normalizeHisBridgeMethod_(config.HIS_BRIDGE_METHOD || 'POST');
  config.HIS_EXCEL_METHOD = normalizeHisBridgeMethod_(config.HIS_EXCEL_METHOD || config.HIS_BRIDGE_METHOD || 'POST');
  config.HIS_EXCEL_AUTO_SUBMIT = parseHisBridgeBoolean_(config.HIS_EXCEL_AUTO_SUBMIT, false);
  config.HIS_EXCEL_AUTO_CLOSE_MS = parseHisBridgeInteger_(config.HIS_EXCEL_AUTO_CLOSE_MS, 2500);
  config.HIS_EXCEL_TARGET_MODE = normalizeHisBridgeTargetMode_(config.HIS_EXCEL_TARGET_MODE || 'download-iframe');
  config.HIS_BRIDGE_DEBUG = parseHisBridgeBoolean_(config.HIS_BRIDGE_DEBUG, false);

  return config;
}

function isHisExcelBridgeConfigured_(config){
  config = config || {};

  if(config.HIS_EXCEL_ACTION_URL){
    return true;
  }

  return Boolean(
    config.HIS_BRIDGE_ACTION_URL &&
    config.HIS_EXCEL_URI
  );
}

function buildHisExcelBridgeHtml_(config, payload){
  const formConfig = buildHisExcelFormConfig_(config);
  const safeSummary = buildHisBridgePayloadSummary_(payload);
  const autoSubmit = config.HIS_EXCEL_AUTO_SUBMIT === true;
  const autoCloseMs = config.HIS_EXCEL_AUTO_CLOSE_MS;
  const debug = config.HIS_BRIDGE_DEBUG === true || payload.debug === true;
  const targetName = config.HIS_EXCEL_TARGET_MODE === 'download-iframe'
    ? 'hisExcelDownloadFrame'
    : '_self';

  return [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>HIS Excel Bridge 測試</title>',
    '<style>',
    'body{margin:0;min-height:100vh;padding:24px;font-family:Arial,"Noto Sans TC","Microsoft JhengHei",sans-serif;color:#172033;background:#f8fafc;}',
    '.card{max-width:760px;margin:0 auto;padding:22px 24px;border:1px solid #dbe4ef;border-radius:8px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.06);}',
    'h1{margin:0 0 12px;font-size:26px;}',
    'p{line-height:1.7;}',
    '.meta{display:grid;gap:8px;margin:16px 0;padding:14px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;font-size:14px;}',
    '.label{font-weight:900;color:#475569;}',
    'button{min-height:44px;padding:10px 16px;border-radius:8px;border:1px solid #2563eb;background:#2563eb;color:#fff;font-size:16px;font-weight:800;cursor:pointer;}',
    'button:disabled{opacity:.55;cursor:not-allowed;}',
    '.muted{color:#64748b;}',
    '</style>',
    '</head>',
    '<body>',
    '<main class="card">',
    '<h1>HIS Excel Bridge 測試</h1>',
    '<p id="bridgeStatus">正在準備 HIS Excel 提取</p>',
    '<div class="meta">',
    '<div><span class="label">mode：</span>excel-export</div>',
    '<div><span class="label">autoSubmit：</span>' + escapeHisHtml_(autoSubmit ? 'true' : 'false') + '</div>',
    '<div><span class="label">targetMode：</span>' + escapeHisHtml_(config.HIS_EXCEL_TARGET_MODE) + '</div>',
    '<div><span class="label">payload 摘要：</span>' + escapeHisHtml_(JSON.stringify(safeSummary)) + '</div>',
    '</div>',
    config.HIS_EXCEL_TARGET_MODE === 'download-iframe'
      ? '<iframe name="hisExcelDownloadFrame" style="display:none"></iframe>'
      : '',
    '<form id="hisExcelBridgeForm" method="' + escapeHisHtml_(formConfig.method) + '" action="' + escapeHisHtml_(formConfig.actionUrl) + '" target="' + escapeHisHtml_(targetName) + '">',
    formConfig.fields.map(function(field){
      return '<input type="hidden" name="' + escapeHisHtml_(field.name) + '" value="' + escapeHisHtml_(field.value) + '">';
    }).join(''),
    '</form>',
    autoSubmit
      ? '<p class="muted">此 bridge 已設定自動送出。</p>'
      : '<button id="submitBtn" type="button" onclick="submitHisExcelBridge()">送出 HIS Excel 提取資訊</button>',
    '<p id="closeHint" class="muted"></p>',
    '</main>',
    '<script>',
    '(function(){',
    'var debug=' + (debug ? 'true' : 'false') + ';',
    'var autoSubmit=' + (autoSubmit ? 'true' : 'false') + ';',
    'var autoCloseMs=' + String(autoCloseMs) + ';',
    'var payloadSummary=' + JSON.stringify(safeSummary) + ';',
    'function setStatus(text){var el=document.getElementById("bridgeStatus");if(el){el.textContent=text;}}',
    'function setHint(text){var el=document.getElementById("closeHint");if(el){el.textContent=text;}}',
    'window.submitHisExcelBridge=function(){',
    'var form=document.getElementById("hisExcelBridgeForm");',
    'var btn=document.getElementById("submitBtn");',
    'if(btn){btn.disabled=true;}',
    'if(debug && window.console){console.log("[HIS Bridge] submit summary",payloadSummary);}',
    'setStatus("已送出提取資訊，若瀏覽器允許，Excel 下載將開始。");',
    'form.submit();',
    'setTimeout(function(){',
    'window.close();',
    'setHint("下載請求已送出，請手動關閉此視窗。");',
    '},autoCloseMs);',
    '};',
    'if(debug && window.console){console.log("[HIS Bridge] ready summary",payloadSummary);}',
    'if(autoSubmit){setTimeout(window.submitHisExcelBridge,250);}',
    '})();',
    '</script>',
    '</body>',
    '</html>'
  ].join('');
}

function buildHisExcelFormConfig_(config){
  const useDirectExcelAction =
    Boolean(config.HIS_EXCEL_ACTION_URL);

  const actionUrl =
    useDirectExcelAction
      ? config.HIS_EXCEL_ACTION_URL
      : config.HIS_BRIDGE_ACTION_URL;

  const method =
    useDirectExcelAction
      ? config.HIS_EXCEL_METHOD
      : config.HIS_BRIDGE_METHOD;

  const fields = [];

  if(!useDirectExcelAction){
    addHisHiddenField_(fields, '_AUTOWEB_PROJECT_', config.HIS_BRIDGE_PROJECT);
    addHisHiddenField_(fields, '_AUTOWEB_USER_ID_', config.HIS_BRIDGE_USER_ID);
    addHisHiddenField_(fields, '_AUTOWEB_CODE_PAGE_', config.HIS_BRIDGE_CODE_PAGE);
    addHisHiddenField_(fields, '_AUTOWEB_LANGUAGE_', config.HIS_BRIDGE_LANGUAGE);
    addHisHiddenField_(fields, '_AUTOWEB_PREV_PAGE_', config.HIS_BRIDGE_PREV_PAGE);
    addHisHiddenField_(fields, '_AUTOWEB_COM_FILE_', config.HIS_BRIDGE_COM_FILE);
    addHisHiddenField_(fields, '_AUTOWEB_QUERYTABLE_', config.HIS_BRIDGE_QUERYTABLE);
    addHisHiddenField_(fields, 'uri', config.HIS_EXCEL_URI);
  }
  else if(config.HIS_EXCEL_URI){
    addHisHiddenField_(fields, 'uri', config.HIS_EXCEL_URI);
  }

  return {
    actionUrl:actionUrl,
    method:method,
    fields:fields
  };
}

function addHisHiddenField_(fields, name, value){
  if(value === undefined || value === null || String(value) === ''){
    return;
  }

  fields.push({
    name:String(name),
    value:String(value)
  });
}

function buildHisBridgePayloadSummary_(payload){
  payload = payload || {};
  return {
    mode:String(payload.mode || ''),
    sourcePage:String(payload.sourcePage || ''),
    createdAt:String(payload.createdAt || ''),
    debug:payload.debug === true,
    runtimeMode:String(payload.runtimeMode || ''),
    appVersion:String(payload.appVersion || '')
  };
}

function normalizeHisBridgeMethod_(method){
  method = String(method || '').toUpperCase();
  return method === 'GET' ? 'GET' : 'POST';
}

function normalizeHisBridgeTargetMode_(mode){
  mode = String(mode || '').trim();
  return mode === 'self' ? 'self' : 'download-iframe';
}

function parseHisBridgeBoolean_(value, fallback){
  if(value === true || value === false){
    return value;
  }

  value = String(value || '').trim().toLowerCase();
  if(value === 'true' || value === '1' || value === 'yes' || value === 'y'){
    return true;
  }
  if(value === 'false' || value === '0' || value === 'no' || value === 'n'){
    return false;
  }

  return fallback;
}

function parseHisBridgeInteger_(value, fallback){
  const n = parseInt(value, 10);
  if(isNaN(n) || n < 0){
    return fallback;
  }
  return n;
}

function escapeHisHtml_(value){
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
