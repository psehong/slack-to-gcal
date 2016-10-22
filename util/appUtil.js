const _ = require('lodash');
const moment = require('moment-timezone');

const hasTime = (msg) => {
  if (msg) {
    return /[\d\ \:][AaPp][Mm]/.test(msg);
  }
  return false;
};

const getEventIdFromSlackMsg = (msg) => {
  if (msg && msg.includes('Event ID: ')) {
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
    const day = event.end.dateTime ?
      moment(event.start.dateTime).clone().tz('America/New_York').format('dddd M/D') :
      'None';
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

const gcalEventToSlackEvent = (event) => {
  const formattedTime = formatGcalTimes(event);
  const rsvps = gcalRsvp(event);
  return {
    fallback: `${event.summary} – ${formattedTime.day}`,
    color: '#FF69B4',
    title: `${event.summary} – ${formattedTime.day}`,
    title_link: event.htmlLink,
    text: `${formattedTime.from} to ${formattedTime.to}` +
    `\nLocation: ${event.location ? event.location : 'None'}`,
    footer: `\nAttending: ${rsvps.accepted.length}` +
    `\nNot Attending: ${rsvps.declined.length}`
  };
};

module.exports = {
  getEventIdFromSlackMsg: getEventIdFromSlackMsg,
  gcalEventToSlackEvent: gcalEventToSlackEvent,
  gcalSort: gcalSort,
  gcalTodayRange: gcalTodayRange,
  gcalTmrwRange: gcalTmrwRange,
  gcalUpcomingRange: gcalUpcomingRange,
  gcalEventPhrase: gcalEventPhrase,
  hasTime: hasTime
};
