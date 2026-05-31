/* =====================================
   SKH Design System v1
   00_基礎 / UiThemeDatabase.gs

   總入口用途：
   - 給 UiThemeLoader.html 呼叫
   - 統一確保所有 UI 元件 Sheet 存在
   - 統一回傳所有 UI 元件 Theme 設定

   注意：
   - 這支不要宣告 CSS_DB_SPREADSHEET_ID / CSS_SHEETS / DEFAULT_MARK / CSS_DB_HEADER
   - 各元件自己的 Sheet / token / save / get 留在各自檔案
===================================== */


function ensureUiThemeDatabase(){

  const ensured = [];

  if(typeof getBaseCssSettings === 'function'){

    getBaseCssSettings();

    ensured.push(
      '00_基礎'
    );

  }

  if(typeof getButtonCssSettings === 'function'){

    getButtonCssSettings();

    if(
      typeof CSS_SHEETS !== 'undefined' &&
      CSS_SHEETS.BUTTON
    ){
      ensured.push(
        CSS_SHEETS.BUTTON
      );
    }
    else{
      ensured.push(
        '01_按鈕'
      );
    }

  }

  return {
    ok:true,
    ensured:ensured
  };

}


function getUiThemeSettings(){

  ensureUiThemeDatabase();

  const payload = {};

  if(typeof getBaseCssSettings === 'function'){
    payload.base =
      getBaseCssSettings();
  }

  if(typeof getButtonCssSettings === 'function'){
    payload.button =
      getButtonCssSettings();
  }

  return payload;

}
