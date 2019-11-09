
require('dotenv').config({path: '.env.test'});

const tap = require('tap');
const { parseReminderTime } = require('../../src/factory.service')();
const { createTweet } = require('../../spec/support/utils');


let parsingResult;

const date = new Date("2019-06-12T03:00:05");
const MockDate = require('mockdate');
MockDate.set(date);


parsingResult = parseReminderTime(createTweet({ text: "@RemindMe_OfThis next year", date }));
tap.equal(parsingResult.remindAt.getFullYear(), date.getFullYear() + 1);

parsingResult = parseReminderTime(createTweet({ text: "@RemindMe_OfThis tomorrow", date }));
tap.equal(parsingResult.remindAt.getDay(), date.getDay() + 1);

parsingResult = parseReminderTime(createTweet({ text: "@RemindMe_OfThis bla bla", date }));
tap.equal(parsingResult.failure, "PARSE_TIME_FAILURE");

parsingResult = parseReminderTime(createTweet({ text: "@RemindMe_OfThis last year", date }));
tap.equal(parsingResult.failure, "TIME_IN_PAST");

parsingResult = parseReminderTime(createTweet({ text: "next month @RemindMe_OfThis", date }));
tap.equal(parsingResult.remindAt.getUTCMonth(), date.getUTCMonth() + 1);


parsingResult = parseReminderTime(createTweet({ text: "@RemindMe_OfThis next month @RemindMe_OfThis five minutes", date }));
tap.equal(parsingResult.remindAt.getUTCMonth(), date.getUTCMonth());
tap.equal(parsingResult.remindAt.getMinutes(), date.getMinutes() + 5);


