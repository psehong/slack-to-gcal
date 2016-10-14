const _ = require('lodash');
const rewire = require('rewire');
const assert = require('chai').assert;

const googleClient = rewire('../client/googleClient.js');

describe("googleClient", () => {
  describe("Update attendees", () => {
    const newAttendee = {
      id: 'attendee',
      email: 'test@test.com',
      displayName: 'Test'
    };
    it("Adds attendees to event with no attendees", () => {
      const updateAttendees = googleClient.__get__('updateAttendees');
      const mockGcalEvent = {
        calendarId: 'calendarTest',
        eventId: 'eventTest'
      };
      const actual = updateAttendees(mockGcalEvent, [newAttendee], []);
      const expected = _.assign(mockGcalEvent, { attendees: [newAttendee] });
      assert.isTrue(_.isEqual(actual, expected));
    });
    it("Adds attendees to event with existing attendees", () => {
      const updateAttendees = googleClient.__get__('updateAttendees');
      const mockGcalEvent = {
        calendarId: 'calendarTest',
        eventId: 'eventTest',
        attendees: [{
          id: 'calbot',
          email: 'calbot@calbot.com',
          displayName: 'Cal Bot'
        }]
      };
      const actual = updateAttendees(mockGcalEvent, [newAttendee], []);
      const expected = _.assign(mockGcalEvent, { attendees: [...mockGcalEvent.attendees, newAttendee] });
      assert.isTrue(_.isEqual(actual, expected));
    });
    it("Removes attendees to event with existing attendees", () => {
      const updateAttendees = googleClient.__get__('updateAttendees');
      const mockGcalEvent = {
        calendarId: 'calendarTest',
        eventId: 'eventTest',
        attendees: [{
          id: 'calbot',
          email: 'calbot@calbot.com',
          displayName: 'Cal Bot'
        }, newAttendee]
      };
      const actual = updateAttendees(mockGcalEvent, [], [newAttendee]);
      const expected = mockGcalEvent;
      assert.isTrue(_.isEqual(actual, expected));
    });
    it("Does nothing in attempt to remove attendees to event with no attendees", () => {
      const updateAttendees = googleClient.__get__('updateAttendees');
      const mockGcalEvent = {
        calendarId: 'calendarTest',
        eventId: 'eventTest'
      };
      const actual = updateAttendees(mockGcalEvent, [], [newAttendee]);
      const expected = mockGcalEvent;
      assert.isTrue(_.isEqual(actual, expected));
    });
  });
});
