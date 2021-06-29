require('dotenv').config({path: '.env.test'});

require("../support/mocks").mockCache();
const cache = require('../../src/cache');
const {parseReminderTime} = require('../../src/factory.service')(cache);
const {setUserSettings} = require('../../src/factory.settings')(cache);

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

let parsingResult;

test('handles relative times', async () => {
    parsingResult = await parseReminderTime(createMention({text: "@RemindMe_OfThis next year"}));
    expect(parsingResult.remindAt.getFullYear()).toBe(mockDate.getFullYear() + 1);

    parsingResult = await parseReminderTime(createMention({text: "@RemindMe_OfThis tomorrow"}));
    expect(parsingResult.remindAt.getDay()).toBe(mockDate.getDay() + 1);

    parsingResult = await parseReminderTime(createMention({text: "@RemindMe_OfThis bla bla"}));
    expect(parsingResult.failure).toBe("PARSE_TIME_FAILURE");

    parsingResult = await parseReminderTime(createMention({text: "next month @RemindMe_OfThis"}));
    expect(parsingResult.remindAt.getUTCMonth()).toBe(mockDate.getUTCMonth() + 1);
});

test("doesn't set for time in past", async () => {
    parsingResult = await parseReminderTime(createMention({text: "@RemindMe_OfThis last year"}));
    expect(parsingResult.failure).toBe("TIME_IN_PAST");

    parsingResult = await parseReminderTime(createMention({text: "@RemindMe_OfThis January 2018"}));
    expect(parsingResult.failure).toBe("TIME_IN_PAST");
});

test("doesn't set for time in far future (>=30 years)", async () => {
    parsingResult = await parseReminderTime(createMention({text: "@RemindMe_OfThis Jan 2100"}));
    expect(parsingResult.failure).toBe("TIME_IN_FAR_FUTURE");

    parsingResult = await parseReminderTime(createMention({text: "@RemindMe_OfThis in 1000 years"}));
    expect(parsingResult.failure).toBe("TIME_IN_FAR_FUTURE");
});

test("picks time after the last mention", async () => {
    parsingResult = await parseReminderTime(createMention({
        text: "@RemindMe_OfThis next month @RemindMe_OfThis five minutes",
    }));
    expect(parsingResult.remindAt.getUTCMonth()).toBe(mockDate.getUTCMonth());
    expect(parsingResult.remindAt.getMinutes()).toBe(mockDate.getMinutes() + 5);

    parsingResult = await parseReminderTime(createMention({
        text: "next month @RemindMe_OfThis five minutes",
    }));
    expect(parsingResult.remindAt.getUTCMonth()).toBe(mockDate.getUTCMonth());
    expect(parsingResult.remindAt.getMinutes()).toBe(mockDate.getMinutes() + 5);
});

test("respects a user's timezone setting", async () => {
    // It's UTC+5 user's time
    await setUserSettings("xxx", {utcOffset: 300});
    let currentUTCHour = mockDate.getHours() + (mockDate.getTimezoneOffset() / 60);
    let usersCurrentTime = currentUTCHour + 5;
    parsingResult = await parseReminderTime(createMention({
        text: `@RemindMe_OfThis at ${usersCurrentTime + 14}:00`,
        author: "xxx"
    }));
    expect(
        parsingResult.remindAt.getHours() // reminder time
        + (mockDate.getTimezoneOffset() / 60) // + machine offset =  reminder hour in UTC+0
    ).toBe(currentUTCHour + 14);

    parsingResult = await parseReminderTime(createMention({
        text: `@RemindMe_OfThis in one hour`,
        author: "xxx"
    }));
    expect(parsingResult.remindAt.getHours()).toBe(mockDate.getHours() + 1);
});
