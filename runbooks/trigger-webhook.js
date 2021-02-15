'use strict';

const {createTweetCreateEvent, createTweet} = require("../tests/support/utils");
const got = require('got');
const {mockMetrics, mockTwitterAPI} = require("../tests/support/mocks");
mockMetrics();
mockTwitterAPI();

(async () => {
    const endpoint = "http://localhost:3000/webhook";
    const webhook = createTweetCreateEvent(createTweet({
        username: 'theshalvah',
        text: 'in five minutes',
    }));
    const response = await got.post(endpoint, {
        json: webhook,
    });
    console.log(response.body);
})();