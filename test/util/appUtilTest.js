const _ = require('lodash');
const rewire = require('rewire');
const assert = require('chai').assert;

const appUtil = rewire('../../util/appUtil.js');


describe("appUtil", () => {
  describe("hasText", () => {
    it("Accepts messages with time", () => {
      assert.isTrue(appUtil.hasTime('Pick up the van at 8PM'));
    });
    it("Rejects messages with no time", () => {
      assert.isFalse(appUtil.hasTime('Pick up the van at 8'));
    });
  });
  describe("getEventIdFromSlackMsg", () => {
    it("Parses well formed eventId", () => {
      const expected = "asdf1234";
      const actual = appUtil.getEventIdFromSlackMsg(`Event ID: ${expected}`);
      assert.equal(actual, expected);
    });
    it("Returns empty for malformed eventId", () => {
      const expected = "";
      const actual = appUtil.getEventIdFromSlackMsg(`ID: 1234`);
      assert.equal(actual, expected);
    });
  });
  describe("formatGcalTimes", () => {
    it("Formats human readable GCal times", () => {
      const mockEvent = {
        start: {
          dateTime: '2016-10-22T22:53:39-4:00'
        },
        end: {
          dateTime: '2016-10-22T23:53:39-4:00'
        }
      };
      const expected = {
        from: '10:53 PM EDT',
        to: '11:53 PM EDT',
        day: 'Saturday 10/22'
      };
      const actual = appUtil.__get__('formatGcalTimes')(mockEvent);
      assert.isTrue(_.isEqual(expected, actual));
    });
  });
  describe("gcalEventToSlackEvent", () => {
    it("Converts GCal event to formatted Slack message", () => {
      const mockEvent = {
        summary: 'asummary',
        htmlLink: 'alink',
        attendees: [{
          responseStatus: 'accepted'
        }, {
          responseStatus: 'accepted'
        }, {
          responseStatus: 'declined'
        }, {
          responseStatus: 'accepted'
        }, {
          responseStatus: 'declined'
        }],
        start: {
          dateTime: '2016-10-22T22:53:39-4:00'
        },
        end: {
          dateTime: '2016-10-22T23:53:39-4:00'
        }
      };
      const expected = {
        fallback: 'asummary – Saturday 10/22',
        color: '#FF69B4',
        title: 'asummary – Saturday 10/22',
        title_link: 'alink',
        text: '10:53 PM EDT to 11:53 PM EDT\nLocation: None',
        footer: '\nAttending: 3\nNot Attending: 2'
      };
      const actual = appUtil.gcalEventToSlackEvent(mockEvent);
      assert.isTrue(_.isEqual(expected, actual));
    });
  });
});
