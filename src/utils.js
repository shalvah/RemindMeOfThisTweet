'use strict';

const finish = (cb = null, cache = null) => {
    if (cache) cache.quit();

    return {
        success(body) {
            console.log(`Response: ${body}`);
            return {
                statusCode: 200,
                body
            };
        },

        fail(err) {
            console.log(`Fail response: ${err}`);
            throw err;
        },

    }
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

const SUCCESS = 'Success';

const FAIL = 'Fail';

const UNCERTAIN = 'Uncertain';

module.exports = {
    randomReminderMessage,
    randomAcknowledgementMessage,
    finish,
    cronify,
    getDateToNearestMinute,
    SUCCESS,
    FAIL,
    UNCERTAIN
};
