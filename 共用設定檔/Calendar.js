/*
========================================
Calendar.gs
行事曆共用工具
========================================
*/

function getConfiguredCalendar(){

  if(
    typeof CALENDAR_ID !== 'undefined' &&
    CALENDAR_ID
  ){

    const calendarById =
      CalendarApp.getCalendarById(
        CALENDAR_ID
      );

    if(calendarById){
      return calendarById;
    }

  }

  const calendarsByName =
    CalendarApp.getCalendarsByName(
      CALENDAR_NAME
    );

  if(
    calendarsByName &&
    calendarsByName.length > 0
  ){
    return calendarsByName[0];
  }

  const targetName =
    normalizeCalendarName(
      CALENDAR_NAME
    );

  const calendars =
    CalendarApp.getAllCalendars();

  for(let i = 0; i < calendars.length; i++){

    const calendarName =
      normalizeCalendarName(
        calendars[i].getName()
      );

    if(
      calendarName === targetName
    ){
      return calendars[i];
    }

  }

  return null;

}


function getConfiguredCalendarEvents(start, end){

  const calendar =
    getConfiguredCalendar();

  if(calendar){

    return calendar.getEvents(
      start,
      end
    );

  }

  try{

    return getPublicCalendarEvents(
      start,
      end
    );

  }catch(error){

    return [];

  }

}


function getCalendarSourceLabel(){

  try{

    if(
      getConfiguredCalendar()
    ){
      return 'Calendar';
    }

  }catch(error){

    return getCalendarIcalAccessLabel();

  }

  return getCalendarIcalAccessLabel();

}


function getPublicCalendarEvents(start, end){

  const data =
    getPublicCalendarData();

  return expandPublicCalendarEvents(
    data.events,
    start,
    end
  );

}


function getPublicCalendarData(){

  const response =
    UrlFetchApp.fetch(
      getCalendarIcalUrl(),
      {
        muteHttpExceptions: true
      }
    );

  const code =
    response.getResponseCode();

  if(code < 200 || code >= 300){

    throw new Error(
      getCalendarIcalAccessLabel() +
      ' 讀取失敗，HTTP ' +
      code
    );

  }

  return parsePublicCalendarIcs(
    response.getContentText()
  );

}


function getCalendarIcalUrl(){

  if(
    typeof CALENDAR_ICAL_URL !== 'undefined' &&
    CALENDAR_ICAL_URL
  ){

    return CALENDAR_ICAL_URL;

  }

  return 'https://calendar.google.com/calendar/ical/' +
    encodeURIComponent(
      CALENDAR_ID
    ) +
    '/public/basic.ics';

}


function getCalendarIcalAccessType(){

  const url =
    getCalendarIcalUrl();

  if(
    /\/private-[^/]+\/basic\.ics(?:[?#].*)?$/i.test(
      url
    )
  ){
    return 'private';
  }

  if(
    /\/public\/basic\.ics(?:[?#].*)?$/i.test(
      url
    )
  ){
    return 'public';
  }

  return 'unknown';

}


function getCalendarIcalAccessLabel(){

  const type =
    getCalendarIcalAccessType();

  if(type === 'private'){
    return '非公開 iCal';
  }

  if(type === 'public'){
    return '公開 iCal';
  }

  return 'iCal';

}


function parsePublicCalendarIcs(text){

  const lines =
    unfoldIcsLines(
      text
    );

  const events =
    [];

  let calendarName =
    '';

  let currentEvent =
    null;

  lines.forEach(function(line){

    if(line === 'BEGIN:VEVENT'){

      currentEvent =
        {
          exDates: []
        };

      return;

    }

    if(line === 'END:VEVENT'){

      if(currentEvent){
        events.push(currentEvent);
      }

      currentEvent =
        null;

      return;

    }

    const parsed =
      parseIcsLine(
        line
      );

    if(!parsed){
      return;
    }

    if(
      !currentEvent &&
      parsed.name === 'X-WR-CALNAME'
    ){

      calendarName =
        unescapeIcsText(
          parsed.value
        );

      return;

    }

    if(!currentEvent){
      return;
    }

    if(parsed.name === 'SUMMARY'){

      currentEvent.title =
        unescapeIcsText(
          parsed.value
        );

      return;

    }

    if(parsed.name === 'DTSTART'){

      currentEvent.start =
        parseIcsDate(
          parsed.value,
          parsed.params
        );

      return;

    }

    if(parsed.name === 'DTEND'){

      currentEvent.end =
        parseIcsDate(
          parsed.value,
          parsed.params
        );

      return;

    }

    if(parsed.name === 'RRULE'){

      currentEvent.rrule =
        parseIcsRRule(
          parsed.value
        );

      return;

    }

    if(parsed.name === 'EXDATE'){

      currentEvent.exDates =
        currentEvent.exDates.concat(
          parseIcsDateList(
            parsed.value,
            parsed.params
          )
        );

    }

  });

  return {
    calendarName: calendarName,
    events: events
  };

}


function unfoldIcsLines(text){

  const rawLines =
    String(
      text || ''
    )
      .replace(
        /\r\n/g,
        '\n'
      )
      .replace(
        /\r/g,
        '\n'
      )
      .split(
        '\n'
      );

  const lines =
    [];

  rawLines.forEach(function(line){

    if(
      /^[ \t]/.test(line) &&
      lines.length > 0
    ){

      lines[lines.length - 1] +=
        line.slice(1);

      return;

    }

    lines.push(
      line
    );

  });

  return lines;

}


function parseIcsLine(line){

  const separatorIndex =
    line.indexOf(':');

  if(separatorIndex < 0){
    return null;
  }

  const left =
    line.slice(
      0,
      separatorIndex
    );

  const value =
    line.slice(
      separatorIndex + 1
    );

  const parts =
    left.split(';');

  const params =
    {};

  parts
    .slice(1)
    .forEach(function(part){

      const index =
        part.indexOf('=');

      if(index < 0){
        return;
      }

      params[
        part
          .slice(
            0,
            index
          )
          .toUpperCase()
      ] =
        part.slice(
          index + 1
        );

    });

  return {
    name:
      parts[0].toUpperCase(),
    params: params,
    value: value
  };

}


function parseIcsDateList(value, params){

  return String(
    value || ''
  )
    .split(',')
    .map(function(item){

      return parseIcsDate(
        item,
        params
      );

    })
    .filter(function(date){
      return !!date;
    });

}


function parseIcsDate(value, params){

  const text =
    String(
      value || ''
    ).trim();

  if(!text){
    return null;
  }

  const dateOnly =
    params &&
    params.VALUE === 'DATE' ||
    /^\d{8}$/.test(text);

  const match =
    text.match(
      /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?$/
    );

  if(!match){
    return null;
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]) - 1;

  const day =
    Number(match[3]);

  if(dateOnly){
    return new Date(
      year,
      month,
      day
    );
  }

  const hour =
    Number(match[4] || 0);

  const minute =
    Number(match[5] || 0);

  const second =
    Number(match[6] || 0);

  if(match[7] === 'Z'){

    return new Date(
      Date.UTC(
        year,
        month,
        day,
        hour,
        minute,
        second
      )
    );

  }

  return new Date(
    year,
    month,
    day,
    hour,
    minute,
    second
  );

}


function parseIcsRRule(value){

  const rule =
    {};

  String(
    value || ''
  )
    .split(';')
    .forEach(function(part){

      const index =
        part.indexOf('=');

      if(index < 0){
        return;
      }

      rule[
        part
          .slice(
            0,
            index
          )
          .toUpperCase()
      ] =
        part.slice(
          index + 1
        );

    });

  return rule;

}


function expandPublicCalendarEvents(events, rangeStart, rangeEnd){

  const expanded =
    [];

  events.forEach(function(event){

    expanded.push.apply(
      expanded,
      expandPublicCalendarEvent(
        event,
        rangeStart,
        rangeEnd
      )
    );

  });

  return expanded;

}


function expandPublicCalendarEvent(event, rangeStart, rangeEnd){

  if(!event.start){
    return [];
  }

  const duration =
    (
      event.end
      ? event.end.getTime() - event.start.getTime()
      : 60 * 60000
    );

  if(!event.rrule){

    return buildPublicCalendarOccurrenceIfInRange(
      event,
      event.start,
      duration,
      rangeStart,
      rangeEnd
    );

  }

  return expandPublicCalendarRecurringEvent(
    event,
    duration,
    rangeStart,
    rangeEnd
  );

}


function expandPublicCalendarRecurringEvent(event, duration, rangeStart, rangeEnd){

  const rule =
    event.rrule || {};

  const freq =
    rule.FREQ || '';

  const interval =
    Number(
      rule.INTERVAL || 1
    );

  const count =
    rule.COUNT
    ? Number(
        rule.COUNT
      )
    : null;

  const until =
    rule.UNTIL
    ? parseIcsDate(
        rule.UNTIL,
        {}
      )
    : null;

  const byDays =
    rule.BYDAY
    ? rule.BYDAY.split(',')
    : [
        getIcsWeekdayCode(
          event.start
        )
      ];

  const byMonthDays =
    rule.BYMONTHDAY
    ? rule.BYMONTHDAY
        .split(',')
        .map(function(day){
          return Number(day);
        })
    : [
        event.start.getDate()
      ];

  const occurrences =
    [];

  let seen =
    0;

  let cursor =
    getStartOfIcsDay(
      count
      ? event.start
      : new Date(
          Math.max(
            event.start.getTime(),
            rangeStart.getTime() - duration
          )
        )
    );

  const stop =
    getStartOfIcsDay(
      until && until < rangeEnd
      ? until
      : rangeEnd
    );

  while(cursor <= stop){

    if(
      isPublicCalendarRecurrenceDate(
        cursor,
        event.start,
        freq,
        interval,
        byDays,
        byMonthDays
      )
    ){

      const occurrenceStart =
        copyIcsDateWithTime(
          cursor,
          event.start
        );

      if(occurrenceStart >= event.start){

        seen++;

        if(count && seen > count){
          break;
        }

        if(
          !until ||
          occurrenceStart <= until
        ){

          occurrences.push.apply(
            occurrences,
            buildPublicCalendarOccurrenceIfInRange(
              event,
              occurrenceStart,
              duration,
              rangeStart,
              rangeEnd
            )
          );

        }

      }

    }

    cursor.setDate(
      cursor.getDate() + 1
    );

  }

  return occurrences;

}


function isPublicCalendarRecurrenceDate(
  date,
  startDate,
  freq,
  interval,
  byDays,
  byMonthDays
){

  if(freq === 'DAILY'){

    const diff =
      getIcsDayDiff(
        startDate,
        date
      );

    return diff >= 0 &&
      diff % interval === 0;

  }

  if(freq === 'WEEKLY'){

    const diff =
      getIcsWeekDiff(
        startDate,
        date
      );

    return diff >= 0 &&
      diff % interval === 0 &&
      byDays.indexOf(
        getIcsWeekdayCode(
          date
        )
      ) >= 0;

  }

  if(freq === 'MONTHLY'){

    const diff =
      getIcsMonthDiff(
        startDate,
        date
      );

    return diff >= 0 &&
      diff % interval === 0 &&
      byMonthDays.indexOf(
        date.getDate()
      ) >= 0;

  }

  return false;

}


function buildPublicCalendarOccurrenceIfInRange(
  event,
  occurrenceStart,
  duration,
  rangeStart,
  rangeEnd
){

  if(
    isPublicCalendarExcluded(
      event,
      occurrenceStart
    )
  ){
    return [];
  }

  const occurrenceEnd =
    new Date(
      occurrenceStart.getTime() + duration
    );

  if(
    occurrenceStart >= rangeEnd ||
    occurrenceEnd <= rangeStart
  ){
    return [];
  }

  return [
    buildPublicCalendarEventObject(
      event.title || '',
      occurrenceStart,
      occurrenceEnd
    )
  ];

}


function buildPublicCalendarEventObject(title, start, end){

  return {
    getTitle: function(){
      return title;
    },
    getStartTime: function(){
      return start;
    },
    getEndTime: function(){
      return end;
    }
  };

}


function isPublicCalendarExcluded(event, occurrenceStart){

  return (event.exDates || [])
    .some(function(date){

      return date.getTime() ===
        occurrenceStart.getTime();

    });

}


function getStartOfIcsDay(date){

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

}


function copyIcsDateWithTime(date, time){

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    time.getHours(),
    time.getMinutes(),
    time.getSeconds()
  );

}


function getIcsDayDiff(start, end){

  return Math.floor(
    (
      getStartOfIcsDay(end).getTime() -
      getStartOfIcsDay(start).getTime()
    ) /
    86400000
  );

}


function getIcsWeekDiff(start, end){

  return Math.floor(
    (
      getStartOfIcsWeek(end).getTime() -
      getStartOfIcsWeek(start).getTime()
    ) /
    (
      7 * 86400000
    )
  );

}


function getStartOfIcsWeek(date){

  const start =
    getStartOfIcsDay(
      date
    );

  start.setDate(
    start.getDate() -
    start.getDay()
  );

  return start;

}


function getIcsMonthDiff(start, end){

  return (
    end.getFullYear() -
    start.getFullYear()
  ) * 12 +
  (
    end.getMonth() -
    start.getMonth()
  );

}


function getIcsWeekdayCode(date){

  return [
    'SU',
    'MO',
    'TU',
    'WE',
    'TH',
    'FR',
    'SA'
  ][date.getDay()];

}


function unescapeIcsText(text){

  return String(
    text || ''
  )
    .replace(
      /\\n/gi,
      '\n'
    )
    .replace(
      /\\,/g,
      ','
    )
    .replace(
      /\\;/g,
      ';'
    )
    .replace(
      /\\\\/g,
      '\\'
    );

}


function normalizeCalendarName(name){

  return String(
    name || ''
  )
    .trim()
    .replace(
      /\s+/g,
      ' '
    );

}
