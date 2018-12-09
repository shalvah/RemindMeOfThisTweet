'use strict';

const finish = (cb, cache = null) => {
    if (cache) cache.quit();

    return {
        success(body) {
            console.log(`Response: ${body}`);
            const response = {
                statusCode: 200,
                body
            };
            cb(null, response);
        },

        fail(body) {
            console.log(`Fail response: ${body}`);
            cb(body);
        },

    }
};

const randomSuccessResponse = (username) => {
    let responses = [
        `Hi, @${username}, you asked me to remind you of this tweet. Here's your reminder. 😁😁`,
        `Hey, @${username}, you wanted me to remind you of this tweet. Well, here you go! 🤗🤗`,
        `Hey, @${username}, here's your reminder.😄`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
};

const dateToCronExpression = (date) => {
    let minutes, hours, dayOfMonth, month, dayOfWeek, year;
    year = date.getUTCFullYear();
    month = parseInt(date.getUTCMonth()) + 1;
    dayOfMonth = date.getUTCDate();
    hours = date.getUTCHours();
    minutes = date.getUTCMinutes();

    return `${minutes} ${hours} ${dayOfMonth} ${month} ${dayOfWeek || '?'} ${year}`;
};

const cronify = (date) => `cron(${dateToCronExpression(date)})`;

class TwitterErrorResponse extends Error {
    constructor(endpoint, errors) {
        super('Error from Twitter API call');
        this.name = 'TwitterErrorResponse';
        this.errors = errors;
        this.endpoint = endpoint;
    }
}

const SUCCESS = 'Success';

const FAIL = 'Fail';

const UNCERTAIN = 'Uncertain';

module.exports = {
    randomSuccessResponse,
    finish,
    dateToCronExpression,
    cronify,
    TwitterErrorResponse,
    SUCCESS,
    FAIL,
    UNCERTAIN
};
