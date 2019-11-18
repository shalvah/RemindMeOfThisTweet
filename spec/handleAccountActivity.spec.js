'use strict';
require('dotenv').config({path: '.env.test'});
const screenName = process.env.TWITTER_SCREEN_NAME;

const {createWebhookEvent, createUser, createTweetCreateEvent, createRetweet, createTweet} = require("./support/utils");
const getDateToNearestMinute = require("../src/utils").getDateToNearestMinute;

const { mockCache, mockDate, mockTwitterAPI, mockMetrics, mockNotifications } = require("./support/mocks");
const cache = mockCache();
const today = mockDate();
mockMetrics();
mockNotifications();
mockTwitterAPI();

const handleAccountActivity = require('../handler').handleAccountActivity;

describe("handleAccountActivity", () => {

    describe("when body has no tweet_create_events", () => {

        it("returns correct response", () => {
            handleAccountActivity(createWebhookEvent({}), {})
                .then(response => {
                    expect(response.body).toMatch('No new tweets');
                });

            const body = {
                for_user_id: "2244994945",
                follow_events: [{
                    type: "follow",
                    created_timestamp: "1517588749178",
                    target: createUser(screenName),
                    source: createUser(),
                }],
            };
            handleAccountActivity(createWebhookEvent(body), {})
                .then(response => {
                    expect(response.body).toMatch('No new tweets');
                });
        });

    });

    describe("when body has tweet_create_events", () => {

        beforeEach(function () {
            cache.flushallAsync();
        });

        it("ignores tweets created by itself", () => {
            const body = createTweetCreateEvent(createTweet({username: screenName}));
            return handleAccountActivity(createWebhookEvent(body), {})
                .then(response => {
                    expect(response.body).toMatch('Handled 0 tweets');
                });
        });

        it("ignores retweets", () => {
            const body = createTweetCreateEvent(createRetweet({text: "@RemindMe_OfThis in five minutes"}));
            return handleAccountActivity(createWebhookEvent(body), {})
                .then(response => {
                    expect(response.body).toMatch('Handled 0 tweets');
                });
        });

        it("does not set reminder for tweets where time has past", () => {
            const date = new Date(today);
            date.setFullYear(today.getFullYear() - 1);
            const tweet = createTweet({text: "@RemindMe_OfThis in five minutes", date});
            const body = createTweetCreateEvent(tweet);
            const sinon = require('sinon');
            const logSpy = sinon.spy(console, "log");
            return handleAccountActivity(createWebhookEvent(body), {})
                .then(async response => {
                    expect(response.body).toMatch('Handled 1 tweets');
                    expect(logSpy.calledWith(sinon.match({
                        failure: "TIME_IN_PAST",
                        tweet: sinon.match({
                            id: tweet.id_str,
                            created_at: tweet.created_at,
                            text: tweet.text,
                            referencing_tweet: tweet.in_reply_to_status_id_str,
                            author: tweet.user.screen_name
                        })
                    }))).toBe(true);
                });
        });

        it("handles reminder creations properly", () => {
            const tweet = createTweet({text: "@RemindMe_OfThis in five years"});
            const body = createTweetCreateEvent(tweet);

            return handleAccountActivity(createWebhookEvent(body), {})
                .then(async response => {
                    expect(response.body).toMatch('Handled 1 tweets');

                    const date = new Date(today);
                    date.setFullYear(today.getFullYear() + 5);
                    date.setHours(12);
                    date.setSeconds(0);
                    console.log(date);
                    const key = getDateToNearestMinute(date).toISOString();
                    const tweetObject = JSON.parse(await cache.lrangeAsync(key, 0, -1));
                    expect(tweetObject.id).toMatch(tweet.id_str);
                    expect(new Date(tweetObject.created_at).getTime()).toBe(new Date(tweet.created_at).getTime());
                    expect(tweetObject.text).toMatch(tweet.text);
                    expect(tweetObject.author).toMatch(tweet.user.screen_name);
                });
        });

        it("handles reminder creations and cancellations properly", () => {
            const tweet = createTweet({text: "@RemindMe_OfThis in two years"});
            const body = createTweetCreateEvent(tweet);

            return handleAccountActivity(createWebhookEvent(body), {})
                .then(async response => {
                    expect(response.body).toMatch('Handled 1 tweets');

                    const date = new Date(today);
                    date.setFullYear(today.getFullYear() + 2);
                    date.setHours(12);
                    date.setSeconds(0);
                    console.log(date);
                    const key = getDateToNearestMinute(date).toISOString();
                    const tweetObject = JSON.parse(await cache.lrangeAsync(key, 0, -1));
                    expect(tweetObject.id).toMatch(tweet.id_str);
                    expect(new Date(tweetObject.created_at).getTime()).toBe(new Date(tweet.created_at).getTime());
                    expect(tweetObject.text).toMatch(tweet.text);
                    expect(tweetObject.author).toMatch(tweet.user.screen_name);

                    const notificationKey = (await cache.keysAsync(`*${tweetObject.author}`))[0];
                    return notificationKey.replace(`-${tweetObject.author}`, '');
                })
                .then((notificationId) => {
                    const tweet = createTweet({text: `@${screenName} cancel`, inReplyTo: { id: notificationId, user: screenName } });
                    const body = createTweetCreateEvent(tweet);
                    return handleAccountActivity(createWebhookEvent(body), {});
                })
                .then(async(response) => {
                    expect(response.body).toMatch('Handled 1 tweets');

                    const date = new Date(today);
                    date.setFullYear(today.getFullYear() + 2);
                    date.setHours(12);
                    date.setSeconds(0);

                    const key = getDateToNearestMinute(date).toISOString();
                    const reminder = await cache.lrangeAsync(key, 0, -1);
                    expect(reminder.length).toBe(0);
                });
        });
    });

});
