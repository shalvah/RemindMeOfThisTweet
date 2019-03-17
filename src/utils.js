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

const getReminderDay = (dateTime) => {
    return dateTime.toDateString();
};

const getReminderTime = (dateTime) => {
    return dateTime.toTimeString().replace(/ \(.+\)/, '');
};

const randomAcknowledgementMessage = (reminderTime, username) => {
    let responses = [
        `Sure thing! I'll remind you of this tweet on ${getReminderDay(reminderTime)} at ${getReminderTime(reminderTime)}.😃`,
        `Got it, @${username}! I'll remind you about this on ${getReminderDay(reminderTime)} at ${getReminderTime(reminderTime)}.🤗`,
        `Gotcha, boss! I've set your reminder for ${getReminderDay(reminderTime)} at ${getReminderTime(reminderTime)}.🤗`,
    ];
    let message = responses[Math.floor(Math.random() * responses.length)];
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

const getDateToNearestMinute = (date = new Date) => {
    const coefficient = 1000 * 60;
    return new Date(Math.floor(date.getTime() / coefficient) * coefficient)
};

class TwitterErrorResponse extends Error {
    constructor(endpoint, errors) {
        super('Error from Twitter API call');
        this.name = 'TwitterErrorResponse';
        this.errors = errors;
        this.endpoint = endpoint;
    }

    valueOf() {
        return JSON.stringify({
            name: this.name,
            errors: this.errors,
            endpoint: this.endpoint,
        });
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
    getDateToNearestMinute,
    TwitterErrorResponse,
    SUCCESS,
    FAIL,
    UNCERTAIN
};
