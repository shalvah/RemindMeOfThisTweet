
require('dotenv').config({path: '.env.test'});

const tap = require('tap');
const { mockCache } = require('../../spec/support/mocks');
const { parseReminderTime, setUserSettings } = require('../../src/factory.service')(mockCache());
const { createTweet } = require('../../spec/support/utils');


let parsingResult;

const date = new Date("2019-06-12T03:00:05");
const MockDate = require('mockdate');
MockDate.set(date);

async function test() {
    parsingResult = await parseReminderTime(createTweet({text: "@RemindMe_OfThis next year", date}));
    tap.equal(parsingResult.remindAt.getFullYear(), date.getFullYear() + 1);

    parsingResult = await parseReminderTime(createTweet({text: "@RemindMe_OfThis tomorrow", date}));
    tap.equal(parsingResult.remindAt.getDay(), date.getDay() + 1);

    parsingResult = await parseReminderTime(createTweet({text: "@RemindMe_OfThis bla bla", date}));
    tap.equal(parsingResult.failure, "PARSE_TIME_FAILURE");

    parsingResult = await parseReminderTime(createTweet({text: "@RemindMe_OfThis last year", date}));
    tap.equal(parsingResult.failure, "TIME_IN_PAST");

    parsingResult = await parseReminderTime(createTweet({text: "next month @RemindMe_OfThis", date}));
    tap.equal(parsingResult.remindAt.getUTCMonth(), date.getUTCMonth() + 1);

    // Picks time after the last mention
    parsingResult = await parseReminderTime(createTweet({
        text: "@RemindMe_OfThis next month @RemindMe_OfThis five minutes",
        date
    }));
    tap.equal(parsingResult.remindAt.getUTCMonth(), date.getUTCMonth());
    tap.equal(parsingResult.remindAt.getMinutes(), date.getMinutes() + 5);

    parsingResult = await parseReminderTime(createTweet({
        text: "next month @RemindMe_OfThis five minutes",
        date
    }));
    tap.equal(parsingResult.remindAt.getUTCMonth(), date.getUTCMonth());
    tap.equal(parsingResult.remindAt.getMinutes(), date.getMinutes() + 5);

    // Respects a user's timezone setting
    // It's UTC+5 user's time
    await setUserSettings("xxx", {utcOffset: 300});
    let currentUTCHour = date.getHours() + (date.getTimezoneOffset() / 60);
    let usersCurrentTime = currentUTCHour + 5;
    parsingResult = await parseReminderTime(createTweet({
        text: `@RemindMe_OfThis at ${usersCurrentTime + 14}:00`,
        date,
        username: "xxx"
    }));
    // So actual reminder should be 5pm UTC
    tap.equal(
        parsingResult.remindAt.getHours() + (date.getTimezoneOffset() / 60), // reminder hour in UTC+0
        currentUTCHour + 14
    );
}

test();