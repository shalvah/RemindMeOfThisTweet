'use strict';

const chrono = require('chrono-node');

const { cronify, getDateToNearestMinute } = require('./utils');

const make = (cache, twitter) => {

    const parseReminderTime = (tweet) => {
        const refDate = new Date(tweet.created_at);
        let results = chrono.parse(tweet.text, refDate, {forwardDate: true});
        if (results.length) {
            results[0].start.assign('timezoneOffset', tweet.utcOffset / 60);
            const reminderTime = results[0].start.date();
            if (reminderTime > refDate && reminderTime > new Date) {
                return {
                    remindAt: reminderTime,
                    tweet
                };
            } else {
                return {
                    error: "TIME_IN_PAST",
                    tweet
                };
            }
        } else {
            return {
                error: "PARSE_TIME_FAILURE",
                tweet
            };
        }
    };

    const cancelReminder = async (tweet) => {
        const ruleName = await cache.getAsync(tweet.referencing_tweet + '-' + tweet.author);
        if (ruleName) {
            return await Promise.all([
                unscheduleLambda(ruleName),
                cache.delAsync(tweet.referencing_tweet),
            ]);
        }
        return true;
    };

    const handleMention = (tweet) => {

        // if the tweet is a reply with the word "cancel",
        // we'll attempt to cancel the reminder it references
        const isReminderCancellation = tweet => tweet.text.match(/\bcancel\b/i) && tweet.referencing_tweet;

        if (isReminderCancellation(tweet)) {
            return cancelReminder(tweet);
        }

        return parseReminderTime(tweet);
    };

    const scheduleLambda = async (scheduleAt, data, ruleName) => {
        const AWS = require('aws-sdk');
        const cwevents = new AWS.CloudWatchEvents({region: 'us-east-1'});
        const ruleParams = {
            Name: ruleName,
            ScheduleExpression: scheduleAt,
            State: 'ENABLED'
        };

        await cwevents.putRule(ruleParams).promise();

        const input = {data, ruleName};
        const targetParams = {
            Rule: ruleName,
            Targets: [
                {
                    Arn: process.env.LAMBDA_FUNCTION_ARN,
                    Id: ruleName,
                    Input: JSON.stringify(input)
                }
            ],
        };
        return cwevents.putTargets(targetParams).promise()
            .then(r => {
                console.log(r);
                return {ruleName, status: 'SUCCESS'};
            })
            .catch(r => {
                console.log(r);
                return {ruleName, status: 'FAIL'};
            });
    };

    const scheduleReminder = (tweet, date) => {
        return cache.lpushAsync(getDateToNearestMinute(date).toISOString(), [JSON.stringify(tweet)]);
    };

    const notifyUserOfReminder = (tweet, date) => {
        return twitter.replyWithAcknowledgement(tweet, date)
            .then(r => r.id_str)
            .catch(e =>
                console.log(`Couldn't notify user: ${JSON.stringify(tweet)} - Error: ${e.valueOf()}`)
            );
    };

    const handleParsingResult = async (result) => {
        console.log(result);
        if (result.remindAt) {
            return await Promise.all([
                cache.lpushAsync('PARSE_SUCCESS', [JSON.stringify(result.tweet)]),
                scheduleReminder(result.tweet, result.remindAt),
                notifyUserOfReminder(result.tweet, result.remindAt),
            ]);
        } else if (result.error) {
            await cache.lpushAsync(result.error, [JSON.stringify(result.tweet)]);
            return result.error;
        } else {
            return true;
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
        scheduleLambda,
        handleParsingResult,
        parseReminderTime,
        handleMention
    }
};

module.exports = make;
