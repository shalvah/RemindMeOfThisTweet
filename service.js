'use strict';

const chrono = require('chrono-node');

const make = (db) => {

    return {
        parseReminderTime({ text, time: referenceTime }) {
          let reminderTime = chrono.parse(text, referenceTime, { forwardDate: true });
        },

        handleParsingResult(result) {
            if (result.date) {
                scheduleReminder();
            }
        }
    };
};

module.exports = make;
