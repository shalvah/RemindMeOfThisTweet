const tap = require('tap');
const timeparser = require('../src/timeparser');

const DEFAULT_MOCK_DATE = new Date("2019-06-12T03:00:05");
let MOCK_DATE_IN_USE;

function mockDate(date) {
    const dateForTesting = date || DEFAULT_MOCK_DATE;
    const tzOffset = 0;
    console.log(`Using date ${dateForTesting} with timezone offset ${tzOffset} for testing`);
    const MockDate = require('mockdate');
    MockDate.set(dateForTesting, tzOffset);
    MOCK_DATE_IN_USE = dateForTesting
}

const tomorrow = () => {
    return MOCK_DATE_IN_USE.getDate() + 1;
};

const nextYear = () => {
    return MOCK_DATE_IN_USE.getFullYear() + 1;
};

const inMonths = (howMany) => {
    return (MOCK_DATE_IN_USE.getMonth() + howMany) % 12;
};

const inHours = (howMany) => {
    return (MOCK_DATE_IN_USE.getHours() + howMany) % 24;
};

function scenario (string) {
    const results = timeparser.parse(string, new Date, {forwardDate: true});
    return results;
}

function getDate(results) {
    return results[0].start.date();
}

mockDate();

let parsedDate;

parsedDate = getDate(scenario("April"));
tap.equal(parsedDate.getFullYear(), nextYear());

parsedDate = getDate(scenario("July"));
tap.equal(parsedDate.getFullYear(), MOCK_DATE_IN_USE.getFullYear());

parsedDate = getDate(scenario("12.45 am"));
tap.equal(parsedDate.getDate(), tomorrow());
tap.equal(parsedDate.getHours(), 0);
tap.equal(parsedDate.getMinutes(), 45);

parsedDate = getDate(scenario("in 5 months"));
tap.equal(parsedDate.getDate(), MOCK_DATE_IN_USE.getDate());
tap.equal(parsedDate.getMonth(), inMonths(5));

parsedDate = getDate(scenario("in 15 hours"));
tap.equal(parsedDate.getHours(), inHours(15));