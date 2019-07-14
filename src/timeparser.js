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



const parser = chrono.en_GB;
parser.refiners.push(rollOverYearRefiner);
parser.refiners.push(rollOverDayRefiner);

module.exports = parser;