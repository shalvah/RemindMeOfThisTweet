"use strict";

const mock = require('mock-require');

const mockCache = () => {
    const redis = require("redis-mock");
    require('bluebird').promisifyAll(redis.RedisClient.prototype);
    const cache = redis.createClient();
    mock("../../src/cache", cache);
    return cache;
};

const mockDate = (date) => {
    const DEFAULT_MOCK_DATE = new Date("2019-06-12T03:00:05");
    const dateForTesting = date || DEFAULT_MOCK_DATE;
    const tzOffset = 0;
    console.log(`Using date ${dateForTesting} with timezone offset ${tzOffset} (${dateForTesting.toISOString()}) for testing`);
    const MockDate = require('mockdate');
    MockDate.set(dateForTesting, tzOffset);
    return dateForTesting;
};

const mockMetrics = () => {
    mock('../../src/metrics', { newReminderSet() {}});
};

const mockTwitterAPI = () => {
    const tls = require('tls');
    // MITM converts HTTPS requests to HTTP, so we need to do this
    // so we don't get TLS errors on the response
    tls.TLSSocket.prototype.getPeerCertificate = (detailed) => null;
    const Mitm = require("mitm");
    const mitm = Mitm();
    const tweetRequests = [];
    mitm.on("connect", (socket, opts) => {
        if (!opts.host.includes("twitter.com")) socket.bypass();
    });
    mitm.on("request", (req, res) => {
        if (req.url.includes("statuses/update")) {
            tweetRequests.push(req);
            res.statusCode = 201;
            const tweet = require("./utils").createTweet();
            res.end(JSON.stringify(tweet));
        }
    });
    return tweetRequests;
};

module.exports = {
    mockCache,
    mockDate,
    mockMetrics,
    mockTwitterAPI,
};