"use strict";

const {
    randomReminderMessage,
    randomAcknowledgementMessage,
} = require('./utils');

const {
    errors: {
        RateLimited,
        BadRequest,
        ProblemWithPermissions,
        ProblemWithTwitter,
    },
    wrapTwitterErrors
} = require('twitter-error-handler');
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
            .catch(e => wrapTwitterErrors('statuses/mentions_timeline', e))
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
        let noReply = await cache.getAsync('no-reply');
        if (noReply == 1) {
            console.log("Twitter reply hiatus");
            return;
        }

        let options = {
            in_reply_to_status_id: tweet.id,
            status: `@${tweet.author} ${content}`
        };
        return t.post('statuses/update', options)
            .then(r => r.data)
            .catch(e => (console.log(e), wrapTwitterErrors('statuses/update', e)))
            .catch(e => {
                return aargh(e)
                    .type([RateLimited], async (e) => {
                        // not sending any more replies for a few minutes
                        // to avoid Twitter blocking our API access
                        console.log(`Error: ${e.code}, backing off for 10 minutes`);
                        await cache.setAsync('no-reply', 1, 'EX', 60 * 10);
                    })
                    .type(BadRequest, () => null)
                    // todo handle this better
                    .type(ProblemWithPermissions, console.log)
                    .throw();
            });
    };

    const replyWithReminder = async (tweet) => {
        console.log("Reminding for tweet: " + JSON.stringify(tweet));
        // A common problem is people changing their usernames or deleting Tweets, making the reply show up as a full Tweet
        // Let's fix that by fetching their updated username first (via re-fetching the Tweet)
        const currentTweetDetails = await getTweet(tweet.id);
        if (!currentTweetDetails) {
            return;
        }
        tweet.author = currentTweetDetails.user.screen_name; // eslint-disable-line require-atomic-updates
        let content = randomReminderMessage(tweet.author, tweet.id);
        return reply(tweet, content);
    };

    const getTweet = (id) => {
        return t.get('statuses/show', {id})
            .then(r => r.data)
            .catch(e => wrapTwitterErrors('statuses/show', e))
            .catch(e => {
                return aargh(e)
                    .type([ProblemWithPermissions, BadRequest, ProblemWithTwitter], () => null)
                    .throw();
            });
    }

    const replyWithCancellation = async (tweet) => {
        let content = "Reminder cancelled.";
        return reply(tweet, content);
    };

    const replyWithAcknowledgement = async (tweet, date) => {
        let content = randomAcknowledgementMessage(
            date,
            tweet.author,
            tweet.id
        );
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
        replyWithCancellation,
        fetchAllMentions
    };

};
