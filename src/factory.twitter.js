"use strict";

const {
    randomReminderMessage,
    randomAcknowledgementMessage,
} = require('./utils');

const {
    BackOffTwitterError,
    ClientTwitterError,
    handleTwitterErrors
} = require('./errors');
const aargh = require('aargh');

const Twit = require('twit');

const t = new Twit({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

module.exports = (cache) => {

    const getMentions = async (from = null, to = null) => {
        let lastTweetId = from || await cache.getAsync('lastTweetRetrieved');
        let options = {count: 200, tweet_mode: "extended"};
        if (lastTweetId) {
            options.since_id = lastTweetId;
        }
        if (to) {
            options.max_id = to;
        }
        return t.get('statuses/mentions_timeline', options)
            .then(r => r.data)
            .catch(e => handleTwitterErrors(e, 'statuses/mentions_timeline'))
            .then(tweets => tweets.map(tweetObject => {
                return {
                    id: tweetObject.id_str,
                    created_at: tweetObject.created_at,
                    text: tweetObject.full_text,
                    referencing_tweet: tweetObject.in_reply_to_status_id_str,
                    author: tweetObject.user.screen_name,
                }
            }))
            .then(tweets => {
                if (to) {
                    return tweets.filter(t => t.id !== to);
                }

                return tweets;
            });
    };

    const reply = async (tweet, content) => {
        let options = {
            in_reply_to_status_id: tweet.id,
            status: `@${tweet.author} ${content}`
        };
        return t.post('statuses/update', options)
            .then((r) => r.data)
            .catch(e => handleTwitterErrors(e, 'statuses/update'))
            .catch(e => {
                return aargh(e)
                    .type(BackOffTwitterError, (e) => {
                        // not sending any more replies for a few minutes
                        // to avoid Twitter blocking our API access
                        console.log(`Error: ${e.code}, backing off for ${e.backOffFor} minutes`);
                        return cache.setAsync('no-reply', 1, 'EX', 60 * e.backOffFor);
                    })
                    .type(ClientTwitterError, (e) => console.log(e.valueOf()))
                    .throw();
            });
    };

    const replyWithReminder = async (tweet) => {
        let noReply = await cache.getAsync('no-reply');
        if (noReply == 1) {
            return true;
        }

        let content = randomReminderMessage(tweet.author);
        return reply(tweet, content);
    };

    const replyWithAcknowledgement = async (tweet, date) => {
        let noReply = await cache.getAsync('no-reply');
        if (noReply == 1) {
            return true;
        }

        let content = randomAcknowledgementMessage(date, tweet.author);
        return reply(tweet, content);
    };

    const fetchAllMentions = async (from = null, to = null) => {
        let lastTweetRetrieved = null;
        let count = 0;
        let mentions = await getMentions(from, to);
        let allMentions = [...mentions];
        while (mentions.length) {
            lastTweetRetrieved = mentions[0].id;
            count += mentions.length;
            mentions = await getMentions(lastTweetRetrieved, to);
            allMentions.concat(mentions);
        }

        if (lastTweetRetrieved) {
            await cache.setAsync('lastTweetRetrieved', lastTweetRetrieved);
        }
        return allMentions;
    };

    return {
        replyWithReminder,
        replyWithAcknowledgement,
        fetchAllMentions
    };

};
