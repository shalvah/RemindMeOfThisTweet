'use strict';

const { finish } = require('./utils');
const makeService = require('./service');
const makeCache = require('./factory.cache');
const makeTwitter = require('./factory.twitter');

module.exports.fetchTweetsAndSetReminders = async (event, context, callback) => {
    const cache = await makeCache();
    const twitter = makeTwitter(cache);

    let lastTweetRetrieved = null;
    let count = 0;
    let mentions = await twitter.getMentions();
    let allMentions = [...mentions];
    while (mentions.length) {
        lastTweetRetrieved = mentions[0].id;
        count += mentions.length;
        mentions = await twitter.getMentions(lastTweetRetrieved);
        allMentions.concat(mentions);
    }

    if (lastTweetRetrieved) {
        await cache.setAsync('lastTweetRetrieved', lastTweetRetrieved);
    }

    const service = makeService(cache);
    let results = allMentions.map(service.parseReminderTime);
    await results.map(service.handleParsingResult);

    finish(callback, cache).success(`Published ${count} tweets`);
};

module.exports.remind = async (event, context, callback) => {
    const cache = await makeCache();
    const twitter = makeTwitter(cache);

    const time = event.reminderTime;
    if (parseInt(event.reminderTime) - (new Date).getTime() < 100) {

    }

    finish(callback, cache).success(`Published ${count} tweets`);
};
