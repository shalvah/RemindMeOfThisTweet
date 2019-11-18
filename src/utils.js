'use strict';

const path = require('path');
const fs = require('fs');

const hbs = require('handlebars');
require('handlebars-helpers')(
    ['object', 'comparison', 'misc'],
    {handlebars: hbs}
);

const http = {
        success(body) {
            console.log(`Response: ${body}`);
            const response = {
                statusCode: 200,
                body
            };
            return response;
        },

        fail(err) {
            console.log(`Fail response: ${err}`);
            throw err;
        },

        render(view, data = null) {
            const fileName = path.resolve(__dirname, '..', 'views', `${view}.hbs`);
            let body = fs.readFileSync(fileName, "utf8");

            if (!data) {
                // no need to bother compiling Handlebars template
                return {
                    statusCode: 200,
                    headers: {"content-type": "text/html; charset=utf-8"},
                    body
                };
            }

            let template = hbs.compile(body);
            body = template(data);

            return {
                statusCode: 200,
                headers: {"content-type": "text/html"},
                body
            };
        },

        redirect(location, cookie) {
            let headers = {
                location,
            };
            if (cookie) {
                headers['set-cookie'] = `${cookie}; Domain=.${process.env.EXTERNAL_URL}; `
                    + `Path=/; Max-Age=${60 * 60 * 24 * 7}; Secure; HttpOnly`;
            }
            return {
                statusCode: 302,
                headers,
            };
        },
};

const randomReminderMessage = (username, tweetId) => {
    let responses = [
        `Hi 👋, you asked me to remind you of this tweet. 😁`,
        `⏰ Hey @${username}, you wanted me to remind you of this tweet. Well, here you go! 🤗`,
        `Hey @${username}, here's your reminder.😄 ⏰`,
        `Ding dong! ⏰ Here's your reminder, @${username}.`,
        `Hey boss! Here's the reminder you asked for.👍`,
    ];
    let response = responses[Math.floor(Math.random() * responses.length)];
    response += "\n" + "https://twitter.com/" + username + "/status/" + tweetId;
    return response;
};

const getReminderDay = (dateTime) => {
    return dateTime.toDateString();
};

const getReminderTime = (dateTime) => {
    return dateTime.toTimeString().replace(/ \(.+\)/, '');
};

const randomAcknowledgementMessage = (reminderTime, username, tweetId) => {
    let responses = [
        `Sure thing👌! I'll remind you of this tweet on ${getReminderDay(reminderTime)} at ${getReminderTime(reminderTime)}.😃`,
        `Got it, @${username}! I'll remind you about this on ${getReminderDay(reminderTime)} at ${getReminderTime(reminderTime)}.🤗`,
        `Gotcha, boss! I've set your reminder for ${getReminderDay(reminderTime)} at ${getReminderTime(reminderTime)}.🤗`,
        `Aye aye, captain👮‍♀️! Reminder set for ${getReminderDay(reminderTime)} at ${getReminderTime(reminderTime)}.📝`,
        `Yes, boss. ${getReminderDay(reminderTime)} at ${getReminderTime(reminderTime)}. One new reminder coming right up.`,
    ];
    let message = responses[Math.floor(Math.random() * responses.length)];
    message += " Reply \"cancel\" to cancel this reminder.";
    message += "\n" + "https://twitter.com/" + username + "/status/" + tweetId;
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

const timezones = [
    {
        "value": -720,
        "label": "UTC-12:00"
    },
    {
        "value": -660,
        "label": "UTC-11:00"
    },
    {
        "value": -600,
        "label": "UTC-10:00"
    },
    {
        "value": -570,
        "label": "UTC-09:30"
    },
    {
        "value": -540,
        "label": "UTC-09:00"
    },
    {
        "value": -480,
        "label": "UTC-08:00"
    },
    {
        "value": -420,
        "label": "UTC-07:00"
    },
    {
        "value": -360,
        "label": "UTC-06:00"
    },
    {
        "value": -300,
        "label": "UTC-05:00"
    },
    {
        "value": -240,
        "label": "UTC-04:00"
    },
    {
        "value": -210,
        "label": "UTC-03:30"
    },
    {
        "value": -180,
        "label": "UTC-03:00"
    },
    {
        "value": -120,
        "label": "UTC-02:00"
    },
    {
        "value": -60,
        "label": "UTC-01:00"
    },
    {
        "value": 0,
        "label": "UTC"
    },
    {
        "value": 60,
        "label": "UTC+01:00"
    },
    {
        "value": 120,
        "label": "UTC+02:00"
    },
    {
        "value": 180,
        "label": "UTC+03:00"
    },
    {
        "value": 210,
        "label": "UTC+03:30"
    },
    {
        "value": 240,
        "label": "UTC+04:00"
    },
    {
        "value": 270,
        "label": "UTC+04:30"
    },
    {
        "value": 300,
        "label": "UTC+05:00"
    },
    {
        "value": 330,
        "label": "UTC+05:30"
    },
    {
        "value": 345,
        "label": "UTC+05:45"
    },
    {
        "value": 360,
        "label": "UTC+06:00"
    },
    {
        "value": 390,
        "label": "UTC+06:30"
    },
    {
        "value": 420,
        "label": "UTC+07:00"
    },
    {
        "value": 480,
        "label": "UTC+08:00"
    },
    {
        "value": 525,
        "label": "UTC+08:45"
    },
    {
        "value": 540,
        "label": "UTC+09:00"
    },
    {
        "value": 570,
        "label": "UTC+09:30"
    },
    {
        "value": 600,
        "label": "UTC+10:00"
    },
    {
        "value": 630,
        "label": "UTC+10:30"
    },
    {
        "value": 660,
        "label": "UTC+11:00"
    },
    {
        "value": 720,
        "label": "UTC+12:00"
    },
    {
        "value": 765,
        "label": "UTC+12:45"
    },
    {
        "value": 780,
        "label": "UTC+13:00"
    },
    {
        "value": 840,
        "label": "UTC+14:00"
    },
];

const SUCCESS = 'Success';

const FAIL = 'Fail';

const UNCERTAIN = 'Uncertain';

module.exports = {
    randomReminderMessage,
    randomAcknowledgementMessage,
    http,
    cronify,
    getDateToNearestMinute,
    SUCCESS,
    FAIL,
    UNCERTAIN,
    timezones,
};
