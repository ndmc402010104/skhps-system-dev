/*
========================================
Config.gs
集中管理所有系統設定
原則：
- 只放設定值
- 不放 function
- 不放邏輯判斷
========================================
*/


// ========================================
// System
// 系統共用設定
// ========================================

const TIME_ZONE =
'Asia/Taipei';



// ========================================
// App Entry
// Web App 入口
// ========================================

const APP_ENTRY_URL =
'https://script.google.com/macros/s/AKfycbwbz8pXfU68j2aFeF_AaDmmG6Vco3JsPSw-PGyYeLu0AF3vCfzaZJQFOjORnwSw8Xp4/exec';
const APP_DEV_URL =
'https://script.google.com/macros/s/AKfycbwySlDY2aAbYpy5OSi85vHz1pk5g1FQfopcaCfVneE/dev';
const DEPLOYMENT_ID =
'AKfycbwbz8pXfU68j2aFeF_AaDmmG6Vco3JsPSw-PGyYeLu0AF3vCfzaZJQFOjORnwSw8Xp4';
const APP_DEV_DEPLOYMENT_ID =
'AKfycbwySlDY2aAbYpy5OSi85vHz1pk5g1FQfopcaCfVneE';
const APP_DEFAULT_ENV =
'prod';
const SCRIPT_ID =
'1TN6XHQNLXN6_x4780WEZbEf8IKGaY2t0MQu_F9jT1b2dbo7L3cRV2asQ';
const APP_VERSION =
'2.31.0-202606051207';

const SKH_GAS_DEV_VERSION =
'2.31.0-202606051207';

const SKH_WEB_DEV_VERSION =
'2.31.0-202606051207';

const SKH_WEB_PROD_VERSION =
'2.31.0-202606051207';



// ========================================
// Page Names
// HTML 頁面名稱
// ========================================


// 前台
const FRONT_PAGE_NAME =
'科室系統用戶端/FrontIndex';

const QR_PAGE_NAME =
'科室系統用戶端/SignQRGenerator';

const HOSPITAL_SIGNIN_PAGE_NAME =
'科室系統用戶端/HospitalSignIn';

const SIGN_MEETING_PAGE_NAME =
'科室系統用戶端/SignMeeting';


// 後台
const ADMIN_INDEX_PAGE_NAME =
'後台/後台首頁/AdminIndex';

const ADMIN_MEETING_PAGE_NAME =
'後台/後台簽到管理/AdminMeeting';



// ========================================
// Hidden Admin Entry
// 隱藏入口（非安全機制）
// ========================================

const ADMIN_PAGE_PREFIX =
'admin';

const ADMIN_ACCOUNT =
'plasty';

const ADMIN_PASSWORD =
'1400';



// ========================================
// Google Form
// 晨會簽到表單
// ========================================

const FORM_BASE_URL =
'https://docs.google.com/forms/d/e/1FAIpQLSeuo0v316ZKps-IIN1tC1U_gZ0NMSmEi1XmRcrghJuqPouUDw/viewform';



// ========================================
// Form Entry IDs
// 對應 Google Form 欄位
// ========================================

const COURSE_NAME_ENTRY_ID =
'entry.1034195874';

const DATE_ENTRY_ID =
'entry.239398651';

const TOKEN_ENTRY_ID =
'entry.1762558419';

const NAME_ENTRY_ID =
'entry.874560044';

const EMPLOYEE_ENTRY_ID =
'entry.1180427629';

const ROLE_ENTRY_ID =
'entry.300322984';



// ========================================
// Calendar
// 行事曆來源
// ========================================

const CALENDAR_ID =
'c25b1d017823114707a1edf8d8491894b063fe07b48e1d9fdc627c6b03b8a76b@group.calendar.google.com';

const CALENDAR_ICAL_URL =
'https://calendar.google.com/calendar/ical/c25b1d017823114707a1edf8d8491894b063fe07b48e1d9fdc627c6b03b8a76b%40group.calendar.google.com/private-c6c57c9fada61831021204afc2f2d594/basic.ics';

const CALENDAR_NAME =
'住院醫師行事曆';



// ========================================
// Google Sheet
// 主資料庫
// ========================================

const SHEET_ID =
'184zUBhApg5CJnk7To_6FqlPcV1r-LK1kZUt2yyasD68';

const SKH_MEETING_PROD_SHEET_ID =
SHEET_ID;

const SKH_MEETING_DEV_SHEET_ID =
'';



// ========================================
// Sheet Names
// ========================================

const RESPONSE_SHEET_NAME =
'表單回覆 1';

const RAW_SHEET_NAME =
'原始資料';

const VERIFY_SHEET_NAME =
'簽到驗證';

const SIGN_SHEET_NAME =
'會議簽到單';

const UPLOAD_SHEET_NAME =
'簽到上傳';

const BACKEND_STATUS_SHEET_NAME =
'後台人員狀態設定';



// ========================================
// Dressing System Google Sheet
// 敷料系統資料庫
// ========================================

const DRESSING_SHEET_ID =
'1SJIQGgViQo6AhSDvJTNcNDx_KNXEjgTMfJh4R9SIMvk';

const SKH_DRESSING_PROD_SHEET_ID =
DRESSING_SHEET_ID;

const SKH_DRESSING_DEV_SHEET_ID =
'';

const SKH_SHEET_ROUTING = {
  meeting:{
    prodSheetId:SKH_MEETING_PROD_SHEET_ID,
    devSheetId:SKH_MEETING_DEV_SHEET_ID,
    testSheetId:SKH_MEETING_DEV_SHEET_ID,
    allowDevReadProd:true
  },
  dressing:{
    prodSheetId:SKH_DRESSING_PROD_SHEET_ID,
    devSheetId:SKH_DRESSING_DEV_SHEET_ID,
    testSheetId:SKH_DRESSING_DEV_SHEET_ID,
    allowDevReadProd:true
  }
};

function getSkhRuntimeEnv_(){
  if(typeof APP_REQUEST_ENV !== 'undefined' && APP_REQUEST_ENV === 'dev'){
    return 'dev';
  }

  return 'prod';
}

function getSkhSheetRouting_(domain){
  const routing =
    SKH_SHEET_ROUTING[domain];

  if(!routing){
    throw new Error('Unknown sheet routing domain: ' + domain);
  }

  return routing;
}

function getSkhSheetId_(domain, accessMode){
  const routing =
    getSkhSheetRouting_(domain);

  const mode =
    accessMode === 'write'
    ? 'write'
    : 'read';

  if(getSkhRuntimeEnv_() !== 'dev'){
    return routing.prodSheetId;
  }

  const devSheetId =
    String(routing.devSheetId || routing.testSheetId || '').trim();

  if(devSheetId){
    return devSheetId;
  }

  if(mode === 'read' && routing.allowDevReadProd === true){
    return routing.prodSheetId;
  }

  const error =
    new Error('測試 Sheet 尚未設定，已阻止寫入，避免污染正式資料。');
  error.code = 'TEST_SHEET_NOT_CONFIGURED';
  throw error;
}

function assertSkhSheetWriteAllowed_(domain){
  getSkhSheetId_(domain, 'write');
}



// ========================================
// Dressing Sheet Names
// 敷料系統工作表名稱
// ========================================

const DRESSING_DICT_SHEET_NAME =
'敷料主檔';

const DRESSING_STOCK_SHEET_NAME =
'庫存批號檔';

const DRESSING_USAGE_SHEET_NAME =
'領用記錄';



// ========================================
// QR Meeting Query
// QR 頁面顯示會議範圍
// ========================================

// 往前抓幾天
const QR_EVENT_LOOKBACK_DAYS =
45;

// 往後抓幾天
const QR_EVENT_LOOKAHEAD_DAYS =
45;



// ========================================
// Admin Meeting Query
// 後台會議顯示範圍
// ========================================

// 往後抓幾天
const ADMIN_EVENT_LOOKAHEAD_DAYS =
45;



// ========================================
// Meeting Active Window
// 判定是否允許簽到
// 同時套用：
// - Sign 頁面自動選會議
// - QR 顯示提示
// - 會議進行中判定
// ========================================

// 會議開始前可簽到（分鐘）
const MEETING_RUNNING_BEFORE_MIN =
10;

// 會議結束後仍可簽到（分鐘）
const MEETING_RUNNING_AFTER_MIN =
30;



/*
========================================
未來預留
========================================

FORM_ID

UPLOAD_FOLDER_ID

DEFAULT_SIGN_LIST

F10_RULE

API_KEY

EMAIL_NOTIFY

AUTO_EXPORT

*/
