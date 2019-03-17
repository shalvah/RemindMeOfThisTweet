'use strict';

module.exports = {
    newReminderSet,
};

const { SUCCESS, FAIL, UNCERTAIN } = require('./../utils');
const AWS = require('aws-sdk');
const cloudWatch = new AWS.CloudWatch();

function newReminderSet(reminderData) {
    const term = Math.round((reminderData.remindAt - reminderData.refDate) / 1000);
    const params = [generateMetricsPayload(term, 1)];
    return Promise.all(params.map(p => cloudWatch.putMetricData(p).promise()));
}

function generateMetricsPayload(term, number) {
    return {
        MetricData: [
            {
                MetricName: 'RemindersSet',
                Dimensions: [
                    {
                        Name: 'ReminderTermInSeconds',
                        Value: term // interval between time reminder was set and time of reminder
                    },
                ],
                Timestamp: new Date,
                Unit: 'Count',
                Value: number
            },
        ],
        Namespace: 'RemindMeOfThisTweet'
    };
}
