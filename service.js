'use strict';

const make = (db) => {

    return {
        parseReminderTime(tweet) {

        },

        handleParsingResult(result) {
            if (result.date) {
                scheduleReminder();
            }
        }
    };
};

module.exports = make;
