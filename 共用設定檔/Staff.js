/*
========================================
Staff.gs
負責人員名單與簽到單補人
========================================
*/


/*
========================================
會議簽到單職級排序設定

side:
- left：放 A 欄
- right：放 E 欄

新增職級時，只要在這裡增加規則。
沒有命中任何規則的人會排在右邊最後。
========================================
*/

const MEETING_SIGN_ROLE_ORDER = [
  {
    side: 'left',
    rank: 1,
    labels: ['VS']
  },
  {
    side: 'left',
    rank: 2,
    labels: ['F', 'FELLOW'],
    displayRole: 'F'
  },
  {
    side: 'right',
    rank: 1,
    pattern: '^R\\d+$',
    numberSort: 'desc'
  },
  {
    side: 'right',
    rank: 2,
    labels: ['NP']
  },
  {
    side: 'right',
    rank: 3,
    pattern: '^PGY\\d*$',
    numberSort: 'desc'
  },
  {
    side: 'right',
    rank: 4,
    labels: ['CLERK']
  }
];

const MEETING_SIGN_STATUS_KNOWN_ROLE_PATTERN =
  'VS|R[0-9]+|NP|F|Fellow|PGY[0-9]*|Clerk';

const MEETING_SIGN_DEFAULT_STAFF_LAST_NAME =
  '陳若蘋';


/*
========================================
取得預設人員名單
========================================
*/

function getDefaultStaffList() {

  return [

    { name: '林煌基', emp: 'M000731', role: 'VS' },
    { name: '鄭舉緒', emp: 'M002022', role: 'VS' },
    { name: '林育賢', emp: 'M006988', role: 'VS' },
    { name: '陳柵君', emp: 'M007505', role: 'VS' },
    { name: '林上熙', emp: 'M009487', role: 'VS' },
    { name: '林培新', emp: 'M011646', role: 'VS' },
    { name: '張耀仁', emp: 'M013078', role: 'VS' },
    { name: '蔡可威', emp: 'M013423', role: 'VS' },

    { name: '李冠臻', emp: 'M013934', role: 'F' },
    { name: '郭曰誠', emp: 'M014534', role: 'F' },

    { name: '馬玉坤', emp: 'M015711', role: 'R6' },
    { name: '石益昇', emp: 'M015081', role: 'R5' },
    { name: '黃正豪', emp: 'M015659', role: 'R4' },
    { name: '林奕凱', emp: 'M016152', role: 'R3' },

    { name: '陳若蘋', emp: 'R014514', role: 'NP' },
    { name: '王姿媖', emp: 'R014055', role: 'NP' },

    { name: '吳明娟', emp: 'A017281', role: '秘書' }

  ];

}


function getMeetingSignDefaultStaffList(){

  const staff =
    getDefaultStaffList();

  const lastIndex =
    staff.findIndex(function(person){
      return person.name ===
        MEETING_SIGN_DEFAULT_STAFF_LAST_NAME;
    });

  if(lastIndex < 0){
    return staff;
  }

  return staff.slice(
    0,
    lastIndex + 1
  );

}


/*
========================================
同步會議簽到單人員名單

來源：
1. Staff.js 預設名單
2. 目前會議原始資料裡額外出現的人

排版：
- VS / F 放左邊
- 左邊放不下的 VS / F 會溢位到右邊
- R、NP、PGY、秘書、其他依序放右邊
========================================
*/

function addExtraPeopleToMeetingSignSheet() {

  const ss =
    SpreadsheetApp.openById(
      SHEET_ID
    );

  const raw =
    ss.getSheetByName(
      RAW_SHEET_NAME
    );

  const sign =
    ss.getSheetByName(
      SIGN_SHEET_NAME
    );

  const rawPeople =
    buildRawMeetingPeople(
      raw
        .getDataRange()
        .getValues()
    );

  const people =
    buildMeetingSignPeople(
      rawPeople
    );

  writeMeetingSignPeople(
    sign,
    people
  );


  refreshMeetingSignStatusFormulas(
    sign
  );

  SpreadsheetApp.flush();

}


function buildRawMeetingPeople(rawValues){

  if(
    !rawValues ||
    rawValues.length < 2
  ){
    return [];
  }

  return rawValues
    .slice(1)
    .map(function(row){

      return {
        name:
          String(
            row[3] || ''
          ).trim(),
        role:
          String(
            row[5] || ''
          ).trim()
      };

    })
    .filter(function(person){
      return !!person.name;
    });

}


function buildMeetingSignPeople(rawPeople){

  const peopleByName =
    {};

  let sortIndex =
    0;

  getMeetingSignDefaultStaffList()
    .forEach(function(person){

      addMeetingSignPerson(
        peopleByName,
        person,
        sortIndex
      );

      sortIndex++;

    });

  rawPeople
    .forEach(function(person){

      addMeetingSignPerson(
        peopleByName,
        person,
        sortIndex
      );

      sortIndex++;

    });

  return Object.values(
    peopleByName
  );

}


function addMeetingSignPerson(peopleByName, person, sortIndex){

  const name =
    String(
      person.name || ''
    ).trim();

  if(!name){
    return;
  }

  const key =
    normalizeMeetingSignPersonName(
      name
    );

  if(
    peopleByName[key]
  ){
    return;
  }

  peopleByName[key] = {
    name: name,
    role:
      String(
        person.role || ''
      ).trim(),
    sortIndex: sortIndex
  };

}


function writeMeetingSignPeople(signSheet, people){

  const leftPeople =
    people
      .filter(function(person){
        return isLeftMeetingSignRole(
          person.role
        );
      })
      .sort(
        compareLeftMeetingSignPeople
      );

  const rightPeople =
    people
      .filter(function(person){
        return !isLeftMeetingSignRole(
          person.role
        );
      })
      .sort(
        compareRightMeetingSignPeople
      );

  const leftText =
    leftPeople.map(
      formatMeetingSignPerson
    );

  const overflow =
    leftText.slice(
      12
    );

  const rightText =
    overflow.concat(
      rightPeople.map(
        formatMeetingSignPerson
      )
    );

  writeMeetingSignColumn(
    signSheet,
    'A11:A22',
    leftText.slice(
      0,
      12
    )
  );

  writeMeetingSignColumn(
    signSheet,
    'E11:E22',
    rightText.slice(
      0,
      12
    )
  );

}


function writeMeetingSignColumn(signSheet, rangeA1, values){

  const range =
    signSheet.getRange(
      rangeA1
    );

  const rowCount =
    range.getNumRows();

  const output =
    [];

  for(let i = 0; i < rowCount; i++){

    output.push([
      values[i] || ''
    ]);

  }

  range
    .clearContent()
    .setValues(
      output
    );

}


function isLeftMeetingSignRole(role){

  const rule =
    getMeetingSignRoleRule(
      role
    );

  return !!rule &&
    rule.side === 'left';

}


function compareLeftMeetingSignPeople(a, b){

  return getLeftMeetingSignRoleRank(
    a.role
  )
  -
  getLeftMeetingSignRoleRank(
    b.role
  )
  ||
  a.sortIndex - b.sortIndex;

}


function compareRightMeetingSignPeople(a, b){

  const aRule =
    getMeetingSignRoleRule(
      a.role
    );

  const bRule =
    getMeetingSignRoleRule(
      b.role
    );

  return getRightMeetingSignRoleRank(
    a.role
  )
  -
  getRightMeetingSignRoleRank(
    b.role
  )
  ||
  getMeetingSignNumberSortValue(
    b,
    bRule
  )
  -
  getMeetingSignNumberSortValue(
    a,
    aRule
  )
  ||
  a.sortIndex - b.sortIndex;

}


function getLeftMeetingSignRoleRank(role){

  const rule =
    getMeetingSignRoleRule(
      role
    );

  if(
    rule &&
    rule.side === 'left'
  ){
    return rule.rank;
  }

  return 99;

}


function getRightMeetingSignRoleRank(role){

  const rule =
    getMeetingSignRoleRule(
      role
    );

  if(
    rule &&
    rule.side === 'right'
  ){
    return rule.rank;
  }

  return 99;

}


function getMeetingSignNumberSortValue(person, rule){

  if(
    !rule ||
    rule.numberSort !== 'desc'
  ){
    return 0;
  }

  return getMeetingSignRoleLevel(
    person.role
  );

}


function getMeetingSignRoleLevel(role){

  const match =
    normalizeMeetingSignRole(
      role
    ).match(
      /(\d+)/
    );

  return match
    ? Number(
        match[1]
      )
    : 0;

}


function getMeetingSignRoleRule(role){

  const normalizedRole =
    normalizeMeetingSignRole(
      role
    );

  for(
    let i = 0;
    i < MEETING_SIGN_ROLE_ORDER.length;
    i++
  ){

    const rule =
      MEETING_SIGN_ROLE_ORDER[i];

    if(
      rule.labels &&
      rule.labels.indexOf(
        normalizedRole
      ) >= 0
    ){
      return rule;
    }

    if(
      rule.pattern &&
      new RegExp(
        rule.pattern
      ).test(
        normalizedRole
      )
    ){
      return rule;
    }

  }

  return null;

}


function normalizeMeetingSignRole(role){

  return String(
    role || ''
  )
    .trim()
    .toUpperCase();

}


function normalizeMeetingSignPersonName(name){

  return String(
    name || ''
  )
    .trim()
    .replace(
      /\s+/g,
      ''
    );

}


function formatMeetingSignPerson(person){

  const role =
    getMeetingSignDisplayRole(
      person.role
    );

  return role
    ? role + ' ' + person.name
    : person.name;

}


function getMeetingSignDisplayRole(role){

  const rule =
    getMeetingSignRoleRule(
      role
    );

  if(
    rule &&
    rule.displayRole
  ){
    return rule.displayRole;
  }

  return String(
    role || ''
  ).trim();

}


/*
========================================
更新會議簽到單狀態公式

名字欄：
- 左側 A 欄，狀態 C 欄
- 右側 E 欄，狀態 G 欄

公式會先用已知職級規則移除前綴。
如果遇到未知職稱，會退回移除第一段空白前文字。
避免新增護理師、N2 等職稱時，Sheet 公式漏掉職級清單。
========================================
*/

function refreshMeetingSignStatusFormulas(signSheet){

  const formula =
    buildMeetingSignStatusFormula();

  [
    'C11:C22',
    'G11:G22'
  ].forEach(function(rangeA1){

    signSheet
      .getRange(
        rangeA1
      )
      .setFormula(
        formula
      );

  });

}


function buildMeetingSignStatusFormula(){

  return [
    '=IF(',
    '$C$4="",',
    '"",',
    'LET(',
    'rawPerson,',
    'OFFSET(INDIRECT(ADDRESS(ROW(),COLUMN())),0,-2),',
    'knownPerson,',
    'TRIM(REGEXREPLACE(rawPerson,"^(',
    MEETING_SIGN_STATUS_KNOWN_ROLE_PATTERN,
    ')\\s*","")),',
    'genericPerson,',
    'IFNA(TRIM(REGEXEXTRACT(rawPerson,"^\\S+\\s+(.+)$")),knownPerson),',
    'rowNo,',
    'IFNA(MATCH(knownPerson,\'簽到驗證\'!B:B,0),IFNA(MATCH(genericPerson,\'簽到驗證\'!B:B,0),IFNA(MATCH(rawPerson,\'簽到驗證\'!B:B,0),0))),',
    'IF(',
    'rawPerson="",',
    '"",',
    'IF(',
    'rowNo=0,',
    '"未簽到",',
    'IF(',
    'INDEX(\'簽到驗證\'!F:F,rowNo)="簽到成功",',
    'INDEX(\'簽到驗證\'!E:E,rowNo)&" "&"簽到成功",',
    'INDEX(\'簽到驗證\'!G:G,rowNo)',
    ')',
    ')',
    ')',
    '))'
  ].join('');

}
