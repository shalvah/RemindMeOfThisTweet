'use strict';

const { finish, getDateToNearestMinute } = require('./utils');
const makeService = require('./factory.service');
const makeCache = require('./factory.cache');
const makeTwitter = require('./factory.twitter');

module.exports.fetchTweetsAndSetReminders = async (event, context, callback) => {
    const cache = await makeCache();
    const twitter = makeTwitter(cache);
    const service = makeService(cache, twitter);

    const allMentions = await twitter.fetchAllMentions();

    let results = allMentions.map(service.handleMention);
    await Promise.all(results.map(service.handleParsingResult));

    finish(callback, cache).success(`Handled ${allMentions.length} tweets`);
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
