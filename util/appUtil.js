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
    const day = moment(event.start.dateTime).clone().tz('America/New_York').format('dddd M/D');
    return { from: from, to: to, day: day };
  } else {
    return { from: 'None', to: 'None', day: 'None' };
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

const gcalSort = (event) => {
  return moment(event.start.dateTime).unix();
};

const gcalTodayRange = (dateFormat) => {
  const start = moment().clone().tz('America/New_York').startOf('day').format(dateFormat);
  const end = moment().clone().tz('America/New_York').endOf('day').format(dateFormat);
  return { start: start, end: end };
};

const gcalTmrwRange = (dateFormat) => {
  const start = moment().clone().add(1, 'day').tz('America/New_York').startOf('day').format(dateFormat);
  const end = moment().clone().add(1, 'day').tz('America/New_York').endOf('day').format(dateFormat);
  return { start: start, end: end };
};

const gcalUpcomingRange = (dateFormat) => {
  const start = moment().clone().tz('America/New_York').format(dateFormat);
  const end = moment().clone().tz('America/New_York').add(1, 'year').format(dateFormat);
  return { start: start, end: end };
};

const gcalEventPhrase = (response) => {
  const verb = response.items.length > 1 ? 'are' : 'is';
  const event = response.items.length > 1 ? 'events': 'event';
  return `There ${verb} ${response.items.length} ${event} upcoming`;
};

module.exports = {
  getEventIdFromSlackMsg: getEventIdFromSlackMsg,
  formatGcalTimes: formatGcalTimes,
  gcalRsvp: gcalRsvp,
  gcalSort: gcalSort,
  gcalTodayRange: gcalTodayRange,
  gcalTmrwRange: gcalTmrwRange,
  gcalUpcomingRange: gcalUpcomingRange,
  gcalEventPhrase: gcalEventPhrase,
  hasTime: hasTime
};
