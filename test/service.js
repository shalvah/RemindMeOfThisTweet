'use strict';

const expect = require('chai').expect;

const { cronify }= require('../utils');
const makeService = require('../service');
const {
    parseReminderTime,
    scheduleLambda,
    cleanup
} = makeService();

describe('Service', function() {
/*
    describe('#parseReminderTime()', function() {

        it('parses reminder times correctly', function(done) {
            let tweets = [
                {
                    text: "in 2 days",
                    created_at: "Sun Dec 09 18:43:14 +0000 2018"
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
            const data = {thisIs: "theData", cleanup: true};

            const date = new Date;
            date.setMinutes(parseInt(date.getMinutes()) + 2);

            scheduleLambda(cronify(date), data)
                .then(r => {
                    expect(r.status).to.equal('SUCCESS');
                    done();
                })
                .catch(e => {
                    done(e);
                });
        });
    });

    describe('#cleanup()', function() {

        it('deletes CloudWatch event correctly', function(done) {
            const data = {thisIs: "theData", cleanup: false};

            const date = new Date;
            date.setMinutes(parseInt(date.getMinutes()) + 2);

            scheduleLambda(cronify(date), data)
                .then(r => {
                    expect(r.status).to.equal('SUCCESS');
                    return cleanup(r.ruleName);
                })
                .then(r => {
                    expect(r.status).to.equal('SUCCESS');
                    done();
                })
                .catch(e => {
                    done(e);
                });
        });
    });
});

