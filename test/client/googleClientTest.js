const _ = require('lodash');
const rewire = require('rewire');
const assert = require('chai').assert;

const googleClient = rewire('../../client/googleClient.js');

describe("googleClient", () => {
  describe("Update attendees", () => {
    const newAttendee = {
      id: 'attendee',
      email: 'test@test.com',
      displayName: 'Test'
    };
    const newAcceptedAttendee = Object.assign({ responseStatus: 'accepted' }, newAttendee);
    const newDeclinedAttendee = Object.assign({ responseStatus: 'declined' }, newAttendee);
    const updateAttendees = googleClient.__get__('updateAttendees');
    it("Adds new attendee to event with no attendees", () => {
      const mockGcalEvent = {
        calendarId: 'calendarTest',
        eventId: 'eventTest'
      };
      const actual = updateAttendees(mockGcalEvent, [newAcceptedAttendee]);
      const expected = _.assign(mockGcalEvent, { attendees: [newAcceptedAttendee] });
      assert.isTrue(_.isEqual(actual, expected));
    });
    it("Adds attendees to event with existing attendees", () => {
      const mockGcalEvent = {
        calendarId: 'calendarTest',
        eventId: 'eventTest',
        attendees: [{
          id: 'calbot',
          email: 'calbot@calbot.com',
          displayName: 'Cal Bot',
          responseStatus: 'declined'
        }]
      };
      const actual = updateAttendees(mockGcalEvent, [newDeclinedAttendee]);
      const expected = _.assign(mockGcalEvent, { attendees: [...mockGcalEvent.attendees, newDeclinedAttendee] });
      assert.isTrue(_.isEqual(actual, expected));
    });
    it("Sets declined attendees to event with existing accepted attendees", () => {
      const beforeGcalEvent = {
        calendarId: 'calendarTest',
        eventId: 'eventTest',
        attendees: [{
          id: 'calbot',
          email: 'calbot@calbot.com',
          displayName: 'Cal Bot'
        }, newAcceptedAttendee]
      };
      const afterGcalEvent = {
        calendarId: 'calendarTest',
        eventId: 'eventTest',
        attendees: [{
          id: 'calbot',
          email: 'calbot@calbot.com',
          displayName: 'Cal Bot'
        }, newDeclinedAttendee]
      };
      const actual = updateAttendees(beforeGcalEvent, [newDeclinedAttendee]);
      const expected = afterGcalEvent;
      assert.isTrue(_.isEqual(actual, expected));
    });
    it("Sets accepted attendees to event with existing declined attendees", () => {
      const beforeGcalEvent = {
        calendarId: 'calendarTest',
        eventId: 'eventTest',
        attendees: [{
          id: 'calbot',
          email: 'calbot@calbot.com',
          displayName: 'Cal Bot'
        }, newDeclinedAttendee]
      };
      const afterGcalEvent = {
        calendarId: 'calendarTest',
        eventId: 'eventTest',
        attendees: [{
          id: 'calbot',
          email: 'calbot@calbot.com',
          displayName: 'Cal Bot'
        }, newAcceptedAttendee]
      };
      const actual = updateAttendees(beforeGcalEvent, [newAcceptedAttendee]);
      const expected = afterGcalEvent;
      assert.isTrue(_.isEqual(actual, expected));
    });
  });
});
