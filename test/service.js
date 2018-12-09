'use strict';

const expect = require('chai').expect;

const { cronify }= require('../utils');
const makeService = require('../service');
const {
    parseReminderTime,
    scheduleLambda
} = makeService();

describe('Service', function() {
/*
    describe('#parseReminderTime()', function() {

        it('parses reminder times correctly', function(done) {
            let tweets = [
                {
                    text: "in 2 days",
                    created_at: ""
                }
            ];
            expect(parseReminderTime(tweets[0]).remindAt).to.equal(true);
            expect(parseReminderTime(tweets[0]).remindAt).to.equal(true);
            expect(parseReminderTime(tweets[1]).remindAt).to.equal(false);
            expect(parseReminderTime(tweets[1]).remindAt).to.equal(false);
            expect(parseReminderTime(tweets[2]).remindAt).to.equal(false);
            expect(parseReminderTime(tweets[2]).remindAt).to.equal(false);
            expect(parseReminderTime(tweets[3]).remindAt).to.equal(true);
            expect(parseReminderTime(tweets[3]).remindAt).to.equal(true);
            done();
        });
    });*/

    describe('#scheduleLambda()', function() {

        it('schedules Lambda function correctly', function(done) {
            const data = {thisIs: "theData"};

            const date = new Date;
            date.setMinutes(parseInt(date.getMinutes()) + 3);

            scheduleLambda('TestLambda', cronify(date), data)
                .then(r => {
                    expect(r).to.equal('SUCCESS');
                    done();
                })
                .catch(e => {
                    done(e);
                });
        });
    });
});

