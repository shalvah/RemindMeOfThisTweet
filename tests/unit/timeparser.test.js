const timeparser = require('../../src/timeparser');

const DEFAULT_MOCK_DATE = new Date("2019-06-12T03:00:05");
let MOCK_DATE_IN_USE;

function mockDate(date) {
    const dateForTesting = date || DEFAULT_MOCK_DATE;
    const tzOffset = 0;
    console.log(`Timeparser: Using date ${dateForTesting} with timezone offset ${tzOffset} (${dateForTesting.toISOString()}) for testing`);
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

function scenario(string) {
    return timeparser.parse(string, new Date, {forwardDate: true});
}

function getDate(results) {
    return results[0].start.date();
}

beforeEach(() => {
    mockDate();
})

let parsedDate;

test('It works', () => {
    parsedDate = getDate(scenario("April"));
    expect(parsedDate.getFullYear()).toBe(nextYear());

    parsedDate = getDate(scenario("July"));
    expect(parsedDate.getFullYear()).toBe(MOCK_DATE_IN_USE.getFullYear());

    parsedDate = getDate(scenario("12.45 am"));
    expect(parsedDate.getDate()).toBe(tomorrow());
    expect(parsedDate.getHours()).toBe(0);
    expect(parsedDate.getMinutes()).toBe(45);

    parsedDate = getDate(scenario("in 5 months"));
    expect(parsedDate.getDate()).toBe(MOCK_DATE_IN_USE.getDate());
    expect(parsedDate.getMonth()).toBe(inMonths(5));

    parsedDate = getDate(scenario("in 15 hours"));
    expect(parsedDate.getHours()).toBe(inHours(15));

    parsedDate = getDate(scenario("tomorrow by 6:59pm"));
    expect(parsedDate.getDate()).toBe(tomorrow());
    expect(parsedDate.getHours()).toBe(18);
    expect(parsedDate.getMinutes()).toBe(59);

    parsedDate = getDate(scenario("Tuesday, 9th of July. 19:00 GMT"));
    expect(parsedDate.getDate()).toBe(9);
    expect(parsedDate.getMonth()).toBe(6);
    expect(parsedDate.getHours()).toBe(19);
    expect(parsedDate.getMinutes()).toBe(0);

    parsedDate = getDate(scenario("on Friday by 9:30am"));
    expect(parsedDate.getDate()).toBe(14);
    expect(parsedDate.getMonth()).toBe(5);
    expect(parsedDate.getHours()).toBe(9);
    expect(parsedDate.getMinutes()).toBe(30);

    parsedDate = getDate(scenario("in 22hrs 30mins"));
    expect(parsedDate.getDate()).toBe(13);
    expect(parsedDate.getMonth()).toBe(5);
    expect(parsedDate.getHours()).toBe(1);
    expect(parsedDate.getMinutes()).toBe(30);

    parsedDate = getDate(scenario("in 30 mins"));
    expect(parsedDate.getDate()).toBe(12);
    expect(parsedDate.getMonth()).toBe(5);
    expect(parsedDate.getHours()).toBe(3);
    expect(parsedDate.getMinutes()).toBe(30);
});