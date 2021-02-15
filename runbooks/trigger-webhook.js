'use strict';

const {createTweetCreateEvent, createTweet} = require("../tests/support/utils");
const got = require('got');
const {mockMetrics, mockTwitterAPI} = require("../tests/support/mocks");
mockMetrics();

(async () => {
    const endpoint = "http://localhost:3000/webhook";
    const webhook = createTweetCreateEvent(createTweet({
        username: 'theshalvah',
        text: 'in five minutes',
    }));
    console.log(webhook);
    const response = await got.post(endpoint, {
        json: webhook,
    });
    console.log(response.body);
})();