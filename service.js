'use strict';

const chrono = require('chrono-node');

const {cronify} = require('./utils');

const make = (cache) => {

    return {
        parseReminderTime(tweet) {
            const refDate = new Date(tweet.created_at);
            let reminderTime = chrono.parseDate(tweet.text, refDate, {forwardDate: true});
            if (reminderTime && reminderTime > refDate) {
                return {
                    remindAt: reminderTime,
                    tweet
                };
            } else {
                return tweet;
            }
        },

        async scheduleLambda(scheduleAt, data) {
            const AWS = require('aws-sdk');
            const cwevents = new AWS.CloudWatchEvents({region: 'us-east-1'});

            const ruleName = process.env.LAMBDA_FUNCTION_NAME + '-' + Date.now() + '-' + Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
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
        },

        scheduleReminder(tweet, date) {
            return this.scheduleLambda('TweetReminder', cronify(date), tweet);
        },

        async handleParsingResult(result) {
            console.log(result)
            if (result.remindAt) {
                await Promise.all([
                    cache.lpushAsync('ParsingSuccess', [JSON.stringify(result)]),
                    this.scheduleReminder(result.tweet, result.remindAt)
                    ]);
            } else {
                await cache.lpushAsync('ParsingFail', [JSON.stringify(result)]);
                return 'FAIL';
            }
        },

        cleanup(ruleName) {
            const AWS = require('aws-sdk');
            const cwevents = new AWS.CloudWatchEvents({region: 'us-east-1'});
            return cwevents.removeTargets({
                Rule: ruleName,
                Ids: [ruleName]
            })
                .promise()
                .then(() => cwevents.deleteRule({Name: ruleName}).promise())
                .then(r => {
                    console.log(r);
                    return {status: 'SUCCESS'};
                })
                .catch(r => {
                    console.log(r);
                    return {status: 'FAIL'};
                });
        }
    };
};

module.exports = make;
