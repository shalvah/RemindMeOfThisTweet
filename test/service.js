'use strict';

const expect = require('chai').expect;

const { cronify }= require('../utils');
const makeService = require('../factory.service');
const {
    parseReminderTime,
    scheduleLambda,
    cleanup
} = makeService();

describe('Service', function() {
/*
    describe('#parseReminderTime()', function() {

        it('parses reminder times correctly', function(done) {
            const created_at = "Sun Dec 09 18:43:14 +0000 2018";
            let tweets = [
                {
                    text: "in 2 days",
                    created_at,
                },
                {
                    text: "tomorrow",
                    created_at,
                },
                {
                    text: "in a minutw",
                    created_at,
                },
                {
                    text: "in 5 minutes",
                    created_at,
                },
                {
                    text: "in six minutes",
                    created_at,
                },
                {
                    text: "next week",
                    created_at,
                },
                {
                    text: "in an hour",
                    created_at,
                },
                {
                    text: "in 1 hour",
                    created_at,
                },
                {
                    text: "next month",
                    created_at,
                },
                {
                    text: "in 4 hours",
                    created_at,
                },
                {
                    text: "next year",
                    created_at,
                },
                {
                    text: "in two weeks",
                    created_at,
                },
                {
                    text: "in a month",
                    created_at,
                },
                {
                    text: "in 2 months",
                    created_at,
                },
                {
                    text: "by 9:15",
                    created_at,
                },
                {
                    text: "by 9:15 am",
                    created_at,
                },
                {
                    text: "by 9:15 PM",
                    created_at,
                },
                {
                    text: "at 9:15pm",
                    created_at,
                },
                {
                    text: "in four years",
                    created_at,
                },
            ];

            tweets.forEach(t => {
                expect(parseReminderTime(t).remindAt).to.equal(t.expected);
            });
            done();
        });
    });*/
});

