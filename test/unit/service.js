
require('dotenv').config({path: '.env.test'});

const tap = require('tap');
const { mockCache } = require('../../spec/support/mocks');
const { parseReminderTime, setUserSettings } = require('../../src/factory.service')(mockCache());

let parsingResult;

const mockDate = new Date("2019-06-12T03:00:05");
require('mockdate').set(mockDate);
    
const createMention = ({text, date, author}) => {
    return {
        id: 13984834,
        created_at: date || mockDate,
        text,
        referencing_tweet: null,
        author: author || "diouha",
    };
};

async function test() {
    parsingResult = await parseReminderTime(createMention({text: "@RemindMe_OfThis next year"}));
    tap.equal(parsingResult.remindAt.getFullYear(), mockDate.getFullYear() + 1);

    parsingResult = await parseReminderTime(createMention({text: "@RemindMe_OfThis tomorrow"}));
    tap.equal(parsingResult.remindAt.getDay(), mockDate.getDay() + 1);

    parsingResult = await parseReminderTime(createMention({text: "@RemindMe_OfThis bla bla"}));
    tap.equal(parsingResult.failure, "PARSE_TIME_FAILURE");

    parsingResult = await parseReminderTime(createMention({text: "@RemindMe_OfThis last year"}));
    tap.equal(parsingResult.failure, "TIME_IN_PAST");

    parsingResult = await parseReminderTime(createMention({text: "next month @RemindMe_OfThis"}));
    tap.equal(parsingResult.remindAt.getUTCMonth(), mockDate.getUTCMonth() + 1);

    // Picks time after the last mention
    parsingResult = await parseReminderTime(createMention({
        text: "@RemindMe_OfThis next month @RemindMe_OfThis five minutes",
    }));
    tap.equal(parsingResult.remindAt.getUTCMonth(), mockDate.getUTCMonth());
    tap.equal(parsingResult.remindAt.getMinutes(), mockDate.getMinutes() + 5);

    parsingResult = await parseReminderTime(createMention({
        text: "next month @RemindMe_OfThis five minutes",
    }));
    tap.equal(parsingResult.remindAt.getUTCMonth(), mockDate.getUTCMonth());
    tap.equal(parsingResult.remindAt.getMinutes(), mockDate.getMinutes() + 5);

    // Respects a user's timezone setting
    // It's UTC+5 user's time
    await setUserSettings("xxx", {utcOffset: 300});
    let currentUTCHour = mockDate.getHours() + (mockDate.getTimezoneOffset() / 60);
    let usersCurrentTime = currentUTCHour + 5;
    parsingResult = await parseReminderTime(createMention({
        text: `@RemindMe_OfThis at ${usersCurrentTime + 14}:00`,
        author: "xxx"
    }));
    // So actual reminder should be 5pm UTC
    tap.equal(
        parsingResult.remindAt.getHours() + (mockDate.getTimezoneOffset() / 60), // reminder hour in UTC+0
        currentUTCHour + 14
    );
}

test();