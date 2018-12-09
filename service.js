'use strict';

const chrono = require('chrono-node');

const {cronify} = require('./utils');

const make = (cache) => {

        const parseReminderTime = (tweet) => {
            const refDate = new Date(tweet.created_at);
            let reminderTime = chrono.parseDate(tweet.text, refDate, {forwardDate: true});
            if (reminderTime) {
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

        const scheduleLambda = async (scheduleAt, data) => {
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
        };

        const scheduleReminder = (tweet, date) => {
            return scheduleLambda(cronify(date), tweet);
        };

        const handleParsingResult = async (result) => {
            console.log(result)
            if (result.remindAt) {
                return await Promise.all([
                    cache.lpushAsync('PARSE_SUCCESS', [JSON.stringify(result)]),
                    scheduleReminder(result.tweet, result.remindAt)
                ]);
            } else {
                await cache.lpushAsync(result.error, [JSON.stringify(result)]);
                return result.error;
            }
        };

        const cleanup = (ruleName) => {
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
        };

        return {
            cleanup,
            scheduleLambda,
            handleParsingResult,
            parseReminderTime,
            scheduleReminder
        }
};

module.exports = make;
