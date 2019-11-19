'use strict';

const parser = require('./timeparser');

const {getDateToNearestMinute} = require('./utils');
const metrics = require('./metrics');
const aargh = require('aargh');

const make = (cache, twitter, notifications) => {

    const parseTweetText = async (lastMentionIndex, refDate, tweet, settings = null) => {
        let textToParse = tweet.text.substring(lastMentionIndex);
        let results = parser.parse(textToParse, refDate, {forwardDate: true});
        if (results.length) {
            const mainResult = results[0];
            let userSettings = null;

            // Only use timezone settings if an absolute time was specified
            // Otherwise, this will lead to bugs (possible TIME_IN_PAST)
            if (mainResult.start.knownValues.hour !== undefined
                || mainResult.start.knownValues.minute !== undefined) {
                userSettings = settings || await getUserSettings(tweet.author);
                mainResult.start.assign('timezoneOffset', userSettings.utcOffset);
            }
            const reminderTime = mainResult.start.date();
            if (reminderTime > refDate && reminderTime > new Date) {
                return {
                    remindAt: reminderTime,
                    refDate,
                    tweet,
                };
            }

            if (lastMentionIndex === 0) {
                // No other alternatives
                return {
                    failure: "TIME_IN_PAST",
                    remindAt: reminderTime,
                    tweet
                };
            }

            return parseTweetText(0, refDate, tweet, userSettings);
        }

        if (lastMentionIndex === 0) {
            return {
                failure: "PARSE_TIME_FAILURE",
                tweet
            };
        }
        return parseTweetText(0, refDate, tweet);

    };

    const parseReminderTime = (tweet) => {
        const refDate = new Date(tweet.created_at);

        // In some scenarios, a user might say "We'll see next year! @RemindMe_OfThis on July 3"
        // If it's a reply, the tweet text will come in as "@RemindMe_OfThis We'll see next year! @RemindMe_OfThis on July 3"
        // If it isn't, the tweet text will come in as it appears.
        // Either way, we want to prefer the text *after* the (last) mention,
        // and only fallback to the full text if that fails
        const lastMention = tweet.text.lastIndexOf(`@${process.env.TWITTER_SCREEN_NAME}`);

        return parseTweetText(lastMention, refDate, tweet);
    };

    const cancelReminder = async (tweet) => {
        const cacheKey = tweet.referencing_tweet + '-' + tweet.author;
        console.log(`CANCEL ${JSON.stringify({cacheKey})}`);
        let reminderDetails = await cache.getAsync(cacheKey);

        if (reminderDetails) {
            reminderDetails = JSON.parse(reminderDetails);
            console.log({reminderDetails});
            const remindersOnThatDate = await cache.lrangeAsync(reminderDetails.date, 0, -1);
            console.log({remindersOnThatDate});
            try {
                const indexOfTheReminderWeWant = remindersOnThatDate.map(JSON.parse)
                    .findIndex(r => (r.author == tweet.author) && (reminderDetails.original_tweet == r.id));
                if (indexOfTheReminderWeWant > -1) {
                    await Promise.all([
                        cache.delAsync(cacheKey),
                        // Atomic way to remove element from Redis list by index
                        cache.lsetAsync(reminderDetails.date, indexOfTheReminderWeWant, "__TODELETE__")
                            .then(() => cache.lremAsync(reminderDetails.date, 1, "__TODELETE__"))
                            .catch(console.log) // We don't really care about this error
                    ]);
                    // We don't send any cancellation acknowledgement bc Twitter API limits
                }
            } catch (e) {
                aargh(e)
                // Probably from decoding JSON. The '__TODELETE__' element might still be there (race conditions)
                    .type(SyntaxError, () => null)
                    .throw();
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
            .then(r => r ? r.id_str : null)
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
            if (reminderNotificationTweetId) {
                // So the reminder can be cancelled.
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

    /**
     *
     * @param username
     * @returns {Promise<{utcOffset: number, notifications: {fbtoken: null, enabled: boolean}}>}
     */
    const getUserSettings = async (username) => {
        const defaultUserSettings = {
            utcOffset: 0,
            notifications: {
                enabled: false,
                fbtoken: null,
            },
        };
        return JSON.parse(await cache.getAsync(`settings-${username}`)) || defaultUserSettings;
    };

    const setUserSettings = (username, settings) => {
        return cache.setAsync(`settings-${username}`, JSON.stringify(settings));
    };

    const remind = async (tweet) => {
        const settings = await getUserSettings(tweet.author);
        if (settings.notifications.enabled && settings.notifications.fbtoken) {
            return notifications.sendNotification(
                settings.notifications.fbtoken,
                tweet.author,
                "https://twitter.com/" + tweet.author + "/status/" + tweet.id
            );
        }
        return twitter.replyWithReminder(tweet);
    };

    return {
        cleanup,
        handleParsingResult,
        parseReminderTime,
        handleMention,
        getUserSettings,
        setUserSettings,
        remind,
    }
};

module.exports = make;
