/*
========================================
Token.gs
負責簽到驗證碼產生
========================================
*/

//簽到用的驗證碼
function generateSignToken(
  course,
  date
  ){

  const year =
  new Date()
  .getFullYear();

  const source =
  course +
  year +
  date +
  'SKH';


  const chars =
  'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';


  let token='';


  for(
  let i=1;
  i<=10;
  i++
  ){

  let sum=0;

  for(
  let j=0;
  j<source.length;
  j++
  ){

  sum+=
  source.charCodeAt(j)
  *
  (j+1)
  *
  i;

  }


  token+=
  chars[
  sum%
  chars.length
  ];

  }


  return token;

}