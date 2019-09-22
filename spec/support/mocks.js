"use strict";

const mockCache = () => {
    const redis = require("redis-mock");
    require('bluebird').promisifyAll(redis.RedisClient.prototype);
    return redis.createClient();
};

function mockDate(date) {
    const DEFAULT_MOCK_DATE = new Date("2019-06-12T03:00:05");
    const dateForTesting = date || DEFAULT_MOCK_DATE;
    const tzOffset = 0;
    console.log(`Using date ${dateForTesting} with timezone offset ${tzOffset} (${dateForTesting.toISOString()}) for testing`);
    const MockDate = require('mockdate');
    MockDate.set(dateForTesting, tzOffset);
    return dateForTesting;
}

const mockMetrics = () => {
    const mock = require('mock-require');
    mock('../../src/metrics', { newReminderSet() {}});
};

const mockTwitterAPI = () => {
    const tls = require('tls');
    tls.TLSSocket.prototype.getPeerCertificate = function(detailed) {
        return null;
    };
    const Mitm = require("mitm");
    const mitm = Mitm();
    mitm.on("connect", (socket, opts) => {
        if (!opts.host.includes("twitter.com")) socket.bypass();
    });
    mitm.on("request", (req, res) => {
        if (req.url.includes("statuses/update")) {
            res.statusCode = 201;
            const tweet = require("./utils").createTweet();
            res.end(JSON.stringify(tweet));
        }
    });
};

module.exports = {
    mockCache,
    mockDate,
    mockMetrics,
    mockTwitterAPI,
};