'use strict';

const chrono = require('chrono-node');

// Customize the date/time parser.
// Remember: we're only working with dates in the future

// If we're in July, the string "in June" should refer to next year's June
const rollOverYearRefiner = new chrono.Refiner();
rollOverYearRefiner.refine = (text, results, opt) => {
    results.forEach((result) => {
        if (result.start.isCertain('month') &&
            !result.start.isCertain('year') &&
            result.start.date().getTime() < result.ref.getTime()
        ) {
            result.start.imply('year', result.start.get('year') + 1);
        }
    });
    return results;
};

const rollOverDayRefiner = new chrono.Refiner();
rollOverDayRefiner.refine = (text, results, opt) => {
    results.forEach((result) => {
        if (result.start.isCertain('hour') &&
            !result.start.isCertain('day') &&
            result.start.date().getTime() < result.ref.getTime()
        ) {
            result.start.imply('day', result.start.get('day') + 1);
        }
    });
    return results;
};

// Examples: "Tuesday, 9th of July 2019. 19:00 GMT" and "tomorrow by 9pm"
// Both produce two results each: one with the date and one with the time
const combineDateAndTime = new chrono.Refiner();
combineDateAndTime.refine = (text, results, opt) => {
    if (results.length <  2) {
        // Our current data suggests this scenario only yields two results
        return results;
    }

   const resultWithDate = results.find((result) => {
       return result.start.isCertain('day') || result.start.isCertain('weekday');
   });
   const resultWithTime = results.find((result) => {
       return result.start.isCertain('hour');
   });
    if (resultWithDate == undefined || resultWithTime == undefined) {
        // Faulty thesis; bail.
        return results;
    }

    resultWithDate.start.imply('hour', resultWithTime.start.get('hour'));
    resultWithDate.start.imply('minute', resultWithTime.start.get('minute'));
    resultWithDate.start.imply('meridiem', resultWithTime.start.get('meridiem'));
    resultWithDate.start.imply('timezoneOffset', resultWithTime.start.get('timezoneOffset'));

    resultWithTime.start.imply('weekday', resultWithDate.start.get('weekday'));
    resultWithTime.start.imply('day', resultWithDate.start.get('day'));
    resultWithTime.start.imply('month', resultWithDate.start.get('month'));
    resultWithTime.start.imply('year', resultWithDate.start.get('year'));

    return results;
};

const hrsMinsParser = new chrono.Parser();
hrsMinsParser.pattern = () => /(\d+)\s*hrs?(\s+(\d+)\s*min(s|ute|utes)?)?/i; // Match a pattern like "in 22hrs (30 mins)"
hrsMinsParser.extract = (text, ref, match, opt) => {
    console.log(ref)
    let dateMoment = require('moment')(ref);
    dateMoment = dateMoment.add(match[1], 'hours');
    dateMoment = dateMoment.add(match[3], 'minutes');
    return new chrono.ParsedResult({
        ref: ref,
        text: match[0],
        index: match.index,
        start: {
            hour: dateMoment.hour(),
            minute: dateMoment.minute(),
            second: dateMoment.second(),
            day: dateMoment.date(),
            month: dateMoment.month() + 1,
            year: dateMoment.year(),
        }
    });
};



const parser = chrono.en_GB;
parser.parsers.push(hrsMinsParser);
parser.refiners.push(rollOverYearRefiner);
parser.refiners.push(rollOverDayRefiner);
parser.refiners.push(combineDateAndTime);

module.exports = parser;