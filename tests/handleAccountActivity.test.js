'use strict';
require('dotenv').config({path: '.env.test'});

const {mockCache, mockDate, mockTwitterAPI, mockMetrics, mockNotifications} = require("./support/mocks");
mockCache();
mockMetrics();
mockNotifications();
mockTwitterAPI();

const screenName = process.env.TWITTER_SCREEN_NAME;

const {createWebhookEvent, createUser, createTweetCreateEvent, createRetweet, createTweet} = require("./support/utils");
const getDateToNearestMinute = require("../src/utils").getDateToNearestMinute;

const cache = require('../src/cache');
/** @type {Date} today */
const today = mockDate();

const handleAccountActivity = require('../handler').handleAccountActivity;

describe("handleAccountActivity", () => {

    describe("when body has no tweet_create_events", () => {

        it("returns correct response", async () => {
            await handleAccountActivity(createWebhookEvent({}), {})
                .then(response => {
                    expect(response.body).toBe('No new tweets');
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
            return handleAccountActivity(createWebhookEvent(body), {})
                .then(response => {
                    expect(response.body).toBe('No new tweets');
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
                    expect(response.body).toBe('Handled 0 tweets');
                });
        });

        it("ignores retweets", () => {
            const body = createTweetCreateEvent(createRetweet({text: "@RemindMe_OfThis in five minutes"}));
            return handleAccountActivity(createWebhookEvent(body), {})
                .then(response => {
                    expect(response.body).toBe('Handled 0 tweets');
                });
        });

        it("does not set reminder for tweets where time has past", async () => {
            let tweet = createTweet({text: "@RemindMe_OfThis last year"});
            let body = createTweetCreateEvent(tweet);
            let response = await handleAccountActivity(createWebhookEvent(body), {})

            expect(response.body).toBe('Handled 1 tweets');
            let year = today.getFullYear() - 1;
            let reminder = await cache.keysAsync(year + "-*");
            expect(reminder.length).toBe(0);

            tweet = createTweet({text: "@RemindMe_OfThis in two minutes"});
            body = createTweetCreateEvent(tweet);
            response = await handleAccountActivity(createWebhookEvent(body), {})

            expect(response.body).toBe('Handled 1 tweets');
            reminder = await cache.keysAsync(today.getFullYear() + "-*");
            expect(reminder.length).toBe(0);

        });

        it("handles reminder creations properly", async () => {
            let tweet = createTweet({text: "@RemindMe_OfThis in five years"});
            let body = createTweetCreateEvent(tweet);

            let response = await handleAccountActivity(createWebhookEvent(body), {})

            expect(response.body).toBe('Handled 1 tweets');

            const date = new Date(today);
            date.setFullYear(today.getFullYear() + 5);
            date.setHours(12);
            date.setSeconds(0);
            let key = getDateToNearestMinute(date).toISOString();
            let tweetObject = JSON.parse(await cache.lrangeAsync(key, 0, -1));
            expect(tweetObject.id).toBe(tweet.id_str);
            expect(new Date(tweetObject.created_at).getTime()).toBe(new Date(tweet.created_at).getTime());
            expect(tweetObject.text).toBe(tweet.text);
            expect(tweetObject.author).toBe(tweet.user.screen_name);
        });

        it("properly uses last mention", async () => {
            let tweet = createTweet({text: "now or six months @RemindMe_OfThis six months",});
            let response = await handleAccountActivity(createWebhookEvent(createTweetCreateEvent(tweet)), {})

            expect(response.body).toBe('Handled 1 tweets');

            let reminder = await cache.keysAsync(`${today.getFullYear()}-*`);
            expect(reminder.length).toBe(1);
            let pattern = `${today.getFullYear()}-${today.getMonth() + 1 + 6}-*`;
            reminder = await cache.keysAsync(pattern);
            expect(reminder.length).toBe(1);
        });

        it("handles reminder creations and cancellations properly", () => {
            const tweet = createTweet({text: "@RemindMe_OfThis in two years"});
            const body = createTweetCreateEvent(tweet);

            return handleAccountActivity(createWebhookEvent(body), {})
                .then(async response => {
                    expect(response.body).toBe('Handled 1 tweets');

                    const date = new Date(today);
                    date.setFullYear(today.getFullYear() + 2);
                    date.setHours(12);
                    date.setSeconds(0);
                    const key = getDateToNearestMinute(date).toISOString();
                    const tweetObject = JSON.parse(await cache.lrangeAsync(key, 0, -1));
                    expect(tweetObject.id).toBe(tweet.id_str);
                    expect(new Date(tweetObject.created_at).getTime()).toBe(new Date(tweet.created_at).getTime());
                    expect(tweetObject.text).toBe(tweet.text);
                    expect(tweetObject.author).toBe(tweet.user.screen_name);

                    const notificationKey = (await cache.keysAsync(`*${tweetObject.author}`))[0];
                    return notificationKey.replace(`-${tweetObject.author}`, '');
                })
                .then((notificationId) => {
                    const tweet = createTweet({
                        text: `@${screenName} cancel`,
                        inReplyTo: {id: notificationId, user: screenName}
                    });
                    const body = createTweetCreateEvent(tweet);
                    return handleAccountActivity(createWebhookEvent(body), {});
                })
                .then(async (response) => {
                    expect(response.body).toBe('Handled 1 tweets');

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
