'use strict';

const parser = require('./timeparser');

const { getDateToNearestMinute } = require('./utils');
const metrics = require('./metrics');

const make = (cache, twitter) => {

    const parseReminderTime = (tweet) => {
        const refDate = new Date(tweet.created_at);
        let results = parser.parse(tweet.text, refDate, {forwardDate: true});
        if (results.length) {
            const reminderTime = results[0].start.date();
            if (reminderTime > refDate && reminderTime > new Date) {
                return {
                    remindAt: reminderTime,
                    refDate,
                    tweet
                };
            } else {
                return {
                    failure: "TIME_IN_PAST",
                    tweet
                };
            }
        } else {
            return {
                failure: "PARSE_TIME_FAILURE",
                tweet
            };
        }
    };

    const cancelReminder = async (tweet) => {
        const cacheKey = tweet.referencing_tweet + '-' + tweet.author;
        console.log("CANCEL " + { cacheKey });
        let reminderDetails = await cache.getAsync(cacheKey);

        if (reminderDetails) {
            reminderDetails = JSON.parse(reminderDetails);
            const remindersOnThatDate = await cache.lrangeAsync(reminderDetails.date, 0, -1);
            const indexOfTheReminderWeWant = remindersOnThatDate.map(JSON.parse)
                .findIndex(r => (r.author == tweet.author) && (reminderDetails.original_tweet == r.id));
            if (indexOfTheReminderWeWant != null) {
                await Promise.all([
                    cache.delAsync(cacheKey),
                    // Atomic way to remove element from Redis list by index
                    cache.lsetAsync(reminderDetails.date, indexOfTheReminderWeWant, "__TODELETE__")
                        .then(() => cache.lremAsync(reminderDetails.date, 1, "__TODELETE__"))
                ]);
                await twitter.replyWithCancellation(tweet);
            }

        }
        return true;
    };

    const handleMention = (tweet) => {

        // if the tweet is a reply with the word "cancel",
        // we'll attempt to cancel the reminder it references
        const isReminderCancellation = tweet => tweet.text.match(/\bcancel\b/i) && tweet.referencing_tweet;

        if (isReminderCancellation(tweet)) {
            return {
                cancel: true,
                tweet
            };
        }

        return parseReminderTime(tweet);
    };

    const scheduleReminder = (tweet, date) => {
        return cache.lpushAsync(date, [JSON.stringify(tweet)]);
    };

    const notifyUserOfReminder = (tweet, date) => {
        return twitter.replyWithAcknowledgement(tweet, date)
            .then(r => r.id_str)
            .catch(e => {
                console.log(`Couldn't notify user: ${JSON.stringify(tweet)} - Error: ${e.valueOf()}`);
                throw e;
            });
    };

    const handleParsingResult = async (result) => {
        console.log(result);
        if (result.cancel) {
            return await cancelReminder(result.tweet);
        }

        if (result.remindAt) {
            const date = getDateToNearestMinute(result.remindAt).toISOString();
            await scheduleReminder(result.tweet, date);
            const reminderNotificationTweetId = await notifyUserOfReminder(result.tweet, result.remindAt);
            const cacheKey = reminderNotificationTweetId + "-" + result.tweet.author;
            const reminderDetails = {
                date,
                original_tweet: result.tweet.id
            };
            return await Promise.all([
                metrics.newReminderSet(result),
                cache.setAsync(cacheKey, JSON.stringify(reminderDetails), 'EX', 48 * 60 * 60), // can cancel reminder for up to two days later
            ]);
        }
    };

    const unscheduleLambda = (ruleName) => {
        const AWS = require('aws-sdk');
        const cwevents = new AWS.CloudWatchEvents({region: 'us-east-1'});
        return cwevents.removeTargets({
            Rule: ruleName,
            Ids: [ruleName]
        }).promise()
            .then(() => cwevents.deleteRule({Name: ruleName}).promise());
    };

    const cleanup = (ruleName) => {
        return unscheduleLambda(ruleName)
            .then(r => {
                console.log(r);
                return {status: 'SUCCESS'};
            }).catch(r => {
            console.log(r);
            return {status: 'FAIL'};
        });
    };

    return {
        cleanup,
        handleParsingResult,
        parseReminderTime,
        handleMention
    }
};

module.exports = make;
