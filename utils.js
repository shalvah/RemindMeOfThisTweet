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

const randomReminderMessage = (username) => {
    let responses = [
        `Hi @${username} 👋, you asked me to remind you of this tweet. 😁`,
        `⏰ Hey @${username}, you wanted me to remind you of this tweet. Well, here you go! 🤗`,
        `Hey @${username}, here's your reminder.😄 ⏰`,
        `Ding dong! ⏰ Here's your reminder, @${username}.`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
};

const randomAcknowledgementMessage = (reminderTime, username) => {
    let responses = [
        `Sure thing! I'll remind you of this tweet at ${reminderTime.toUTCString()}.😃`,
        `Got it, @${username}! I'll remind you about this at ${reminderTime.toUTCString()}.🤗`,
    ];
    let message = responses[Math.floor(Math.random() * responses.length)];
    message += ' Reply "cancel" to this message to cancel this reminder.';
    return message;
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
    randomReminderMessage,
    randomAcknowledgementMessage,
    finish,
    cronify,
    TwitterErrorResponse,
    SUCCESS,
    FAIL,
    UNCERTAIN
};
