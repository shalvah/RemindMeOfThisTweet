'use strict';

const { finish, getDateToNearestMinute } = require('./utils');
const makeService = require('./factory.service');
const makeCache = require('./factory.cache');
const makeTwitter = require('./factory.twitter');

module.exports.handleAccountActivity = async (event, context, callback) => {
    const body = JSON.parse(event.body);
    console.log(body);

    if (!body.tweet_create_events) {
        callback(null, {
            statusCode: 200,
            body: 'ok'
        });
        return;
    }

    const cache = await makeCache();
    const twitter = makeTwitter(cache);
    const service = makeService(cache, twitter);

    const allMentions = body.tweet_create_events.filter(tweet => {
        // ignore retweets
        if (tweet.retweeted_status && !tweet.is_quote_status) {
            return false;
        }

        // ignore tweets by myself
        if (tweet.user.screen_name === process.env.TWITTER_SCREEN_NAME) {
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
            utcOffset: parseInt(tweetObject.user.utc_offset)
        };
    })

    let results = allMentions.map(service.handleMention);
    await Promise.all(results.map(service.handleParsingResult));

    finish(callback, cache).success(`Handled ${allMentions.length} tweets`);
};

module.exports.handleTwitterCrc = async (event, context, callback) => {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.TWITTER_CONSUMER_SECRET)
        .update(event.queryStringParameters.crc_token).digest('base64');
    const response = {
        statusCode: 200,
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({ response_token: 'sha256=' + hmac })
    };
    callback(null, response);
};

module.exports.remind = async (event, context, callback) => {
    const cache = await makeCache();
    const twitter = makeTwitter(cache);
    const service = makeService(cache);

    const tweet = event.data;
    await Promise.all([
        twitter.replyWithReminder(tweet),
        service.cleanup(event.ruleName),
    ]);

    finish(callback, cache).success(`Reminded for tweet: ${JSON.stringify(tweet)}`);
};

module.exports.checkForReminders = async (event, context, callback) => {
    const cache = await makeCache();
    const twitter = makeTwitter(cache);
    const service = makeService(cache);

    const key = getDateToNearestMinute().toISOString();
    let reminders = await cache.lrangeAsync(key, 0, -1);
    reminders = reminders.map(JSON.parse);
    await Promise.all([
        reminders.map(twitter.replyWithReminder),
        cache.delAsync(key)
    ]);

    finish(callback, cache).success(`Reminded for ${reminders.length} tweets`);
};

module.exports.retryFailedTasks = async (event, context, callback) => {
    const cache = await makeCache();
    const failedTasks = await cache.lrangeAsync(event.queue || 'PARSE_TIME_FAILURE', 0, -1);

    if (!failedTasks.length) {
        finish(callback, cache).success(`No tasks for retrying in queue ${event.queue}`);
        return;
    }

    await cache.delAsync(event.queue);
    let results = failedTasks.map(service.parseReminderTime);
    await Promise.all(results.map(service.handleParsingResult));

    finish(callback, cache).success(`Retried ${failedTasks.length} tasks from ${event.queue} queue`);
};
