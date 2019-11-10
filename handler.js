'use strict';

const cache = require('./src/cache');
const twitter = require('./src/factory.twitter')(cache);
const service = require('./src/factory.service')(cache, twitter);
const {finish, getDateToNearestMinute, timezones} = require('./src/utils');

module.exports.handleAccountActivity = async (event, context) => {
    const body = JSON.parse(event.body);
    console.log(body);

    if (!body.tweet_create_events) {
        return finish().success(`No new tweets`);
    }

    const screenName = process.env.TWITTER_SCREEN_NAME;
    const allMentions = body.tweet_create_events.filter(tweet => {
        // ignore retweets, but accept quotes
        if (tweet.retweeted_status && !tweet.is_quote_status) {
            return false;
        }

        // exclude manual retweets
        if (tweet.text.startsWith(`RT @${screenName}:`)) {
            return false;
        }

        // ignore tweets by myself
        if (tweet.user.screen_name === screenName) {
            return false;
        }

        return true;

    }).map(tweetObject => {
        return {
            id: tweetObject.id_str,
            created_at: tweetObject.created_at,
            text: tweetObject.full_text || tweetObject.text,
            referencing_tweet: tweetObject.in_reply_to_status_id_str,
            author: tweetObject.user.screen_name,
        };
    });

    try {

        if (allMentions.length) {
            // for failure/recovery purposes
            await cache.setAsync('lastTweetRetrieved', allMentions[allMentions.length - 1].id);
            let results = allMentions.map(service.handleMention);
            await Promise.all(results.map(service.handleParsingResult));
        }
    } catch (err) {
        if (err instanceof (require("redis")).ReplyError) {
            console.log(`Redis error: ${err.command} ${err.args} ${err}`);
        }
        throw err;
    }

    return finish().success(`Handled ${allMentions.length} tweets`);
};

module.exports.handleTwitterCrc = async (event, context) => {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.TWITTER_CONSUMER_SECRET)
        .update(event.queryStringParameters.crc_token).digest('base64');
    const response = {
        statusCode: 200,
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({response_token: 'sha256=' + hmac})
    };
    console.log("CRC handled");
    return response;
};

module.exports.remind = async (event, context) => {
    const tweet = event.data;
    await Promise.all([
        twitter.replyWithReminder(tweet),
        service.cleanup(event.ruleName),
    ]);

    return finish().success(`Reminded for tweet: ${JSON.stringify(tweet)}`);
};

module.exports.checkForRemindersAndSend = async (event, context) => {
    let reminders = [];
    try {
        const key = getDateToNearestMinute().toISOString();
        reminders = await cache.lrangeAsync(key, 0, -1);
        reminders = reminders.map(JSON.parse);
        await Promise.all([
                ...reminders.map(twitter.replyWithReminder),
            cache.delAsync(key)
        ]);
    } catch (err) {
        if (err instanceof (require("redis")).ReplyError) {
            console.log(`Redis error: ${err.command} ${err.args} ${err}`);
        }
        throw err;
    }

    return finish().success(`Reminded for ${reminders.length} tweets`);
};

module.exports.retryFailedTasks = async (event, context) => {
    const failedTasks = await cache.lrangeAsync(event.queue || 'PARSE_TIME_FAILURE', 0, -1);

    if (!failedTasks.length) {
        return finish().success(`No tasks for retrying in queue ${event.queue}`);
    }

    await cache.delAsync(event.queue);
    let results = failedTasks.map(service.parseReminderTime);
    await Promise.all(results.map(service.handleParsingResult));

    return finish().success(`Retried ${failedTasks.length} tasks from ${event.queue} queue`);
};

const defaultUserSettings = {
    utcOffset: 0,
    notifications: {
        enabled: false,
        fbtoken: null,
    },
};

module.exports.getUserSettingsPage = async (event, context) => {
    let username = event.pathParameters.username.toLowerCase();
    const getSettings = cache.getAsync(`settings-${username}`);
    let [settings, ] = await Promise.all([getSettings, ]);
    settings = JSON.parse(settings) || defaultUserSettings;

    return finish().render('settings', {username, settings, timezones});
};

module.exports.updateSettings = async (event, context) => {
    console.log(event.body);
    const body = require('querystring').decode(event.body);

    const username = ""; // Get username from session
    const settings = JSON.parse(await cache.setAsync(`settings-${username}`)) || defaultUserSettings;
    if (body.utcOffset) {
        settings.utcOffset = body.utcOffset;
    }
    if (body.notifications && body.notifications.enabled) {
        settings.notifications.enabled = body.notifications.enabled;
    }
    if (body.notifications && body.notifications.fbtoken) {
        settings.notifications.fbtoken = body.notifications.fbtoken;
    }

    await cache.setAsync(`settings-${username}`, JSON.stringify(settings));

    return {
        statusCode: 302,
        headers: {
            Location: '/settings',
        }
    };
};