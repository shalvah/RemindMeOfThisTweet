'use strict';

const { finish } = require('./utils');
const makeService = require('./service');
const makeCache = require('./factory.cache');
const makeTwitter = require('./factory.twitter');

module.exports.fetchTweetsAndSetReminders = async (event, context, callback) => {
    const cache = await makeCache();
    const twitter = makeTwitter(cache);
    const service = makeService(cache);

    const allMentions = await twitter.fetchAllMentions();

    let results = allMentions.map(service.parseReminderTime);
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

module.exports.retryFailedTasks = async (event, context, callback) => {
    const cache = await makeCache();
    const failedTasks = await cache.lrangeAsync(event.queue, 0, -1);

    if (!failedTasks.length) {
        finish(callback, cache).success(`No tasks for retrying in queue ${event.queue}`);
        return;
    }

    await cache.delAsync(event.queue);
    let results = failedTasks.map(service.parseReminderTime);
    await Promise.all(results.map(service.handleParsingResult));

    finish(callback, cache).success(`Retried ${failedTasks.length} tasks from ${event.queue} queue`);
};
