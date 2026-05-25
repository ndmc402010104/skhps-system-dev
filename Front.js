/*
========================================
Front.gs
負責科室系統首頁
========================================
*/


/*
========================================
首頁
========================================
*/

function showFrontIndex(){

  const template =
    HtmlService.createTemplateFromFile(
      FRONT_PAGE_NAME
    );

  template.appEntryUrl =
    APP_ENTRY_URL;

  return template
    .evaluate()
    .setTitle(
      getAppPageTitle(
        '科室系統首頁'
      )
    );

}



/*
========================================
醫院登入頁
========================================
*/

const EXTRA_HOSPITAL_LOGIN = [

  {
    title:'整外秘書',
    name:'吳明娟',
    emp:'A017281'
  },

  {
    title:'外科秘書',
    name:'張惠淳',
    emp:'A003901'
  },

  {
    title:'手術系統',
    name:'林芳如',
    emp:'R003726'
  },

  {
    title:'晨會簽到',
    name:'陳逸文',
    emp:'A003225'
  },

  {
    title:'藥劑部',
    name:'王敏竹',
    emp:'T018183'
  }

];


function showHospitalSignInPage(){

  const template =

    HtmlService

      .createTemplateFromFile(
        HOSPITAL_SIGNIN_PAGE_NAME
      );


  template.appEntryUrl =
    APP_ENTRY_URL;


  template.staffList =

    JSON.stringify(
      getDefaultStaffList()
    );


  template.extraList =

    JSON.stringify(
      EXTRA_HOSPITAL_LOGIN
    );


  return template

    .evaluate()

    .setTitle(
      getAppPageTitle(
        '醫院系統登入'
      )
    );

}
