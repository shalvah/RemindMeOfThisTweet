'use strict';

const { finish } = require('./utils');
const makeService = require('./service');
const makeDb = require('./factory.db');
const makeTwitter = require('./factory.twitter');

module.exports.fetchTweetsAndSetReminders = async (event, context, callback) => {
    const db = await makeDb();
    const twitter = makeTwitter(db);

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
        await db.setAsync('lastTweetRetrieved', lastTweetRetrieved);
    }

    const service = makeService(db);
    let results = allMentions.map(service.parseReminderTime);
    await results.map(service.handleParsingResult);

    finish(callback, db).success(`Published ${count} tweets`);
};
