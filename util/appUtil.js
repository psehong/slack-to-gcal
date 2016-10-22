const _ = require('lodash');
const moment = require('moment-timezone');

const hasTime = (msg) => {
  if (msg) {
    return /[\d\ \:][AaPp][Mm]/.test(msg);
  }
  return false;
};

const getEventIdFromSlackMsg = (msg) => {
  if (msg) {
    return msg.split('Event ID: ')[1].split(',')[0];
  }
  return '';
};

const formatGcalTimes = (event) => {
  if (event && event.start && event.end) {
    const from = event.start.dateTime ?
      moment(event.start.dateTime).clone().tz('America/New_York').format('h:mm A z') :
      'None';
    const to = event.end.dateTime ?
      moment(event.end.dateTime).clone().tz('America/New_York').format('h:mm A z') :
      'None';
    return { from: from, to: to };
  } else {
    return { from: 'None', to: 'None' };
  }
};

const gcalRsvpStatus = (event, status) => {
  if (event && event.attendees) {
    return _.filter(event.attendees, (attendee) => attendee.responseStatus === status);
  }
  return [];
};

const gcalRsvp = (event) => {
  return {
    accepted: gcalRsvpStatus(event, 'accepted'),
    declined: gcalRsvpStatus(event, 'declined')
  };
};

const gcalTodayRange = (dateFormat) => {
  const start = moment().clone().tz('America/New_York').startOf('day').format(dateFormat);
  const end = moment().clone().tz('America/New_York').endOf('day').format(dateFormat);
  return { start: start, end: end };
};

const gcalUpcomingRange = (dateFormat) => {
  const start = moment().clone().tz('America/New_York').format(dateFormat);
  const end = moment().clone().tz('America/New_York').add(1, 'year').format(dateFormat);
  return { start: start, end: end };
};

module.exports = {
  getEventIdFromSlackMsg: getEventIdFromSlackMsg,
  formatGcalTimes: formatGcalTimes,
  gcalRsvp: gcalRsvp,
  gcalTodayRange: gcalTodayRange,
  gcalUpcomingRange: gcalUpcomingRange,
  hasTime: hasTime
};
