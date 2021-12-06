"use strict";

const mockRequire = require('mock-require');

const setUpMock = (path, factory) => {
    // Jest doesn't play well with mock-require, so we can't use both together
    const isInJest = !!process.env.JEST_WORKER_ID;
    isInJest ? jest.mock(path, factory) : mockRequire(path, factory());
}

const mockCache = () => {
    setUpMock("../../src/cache", () => {
        const redis = require("redis-mock");
        require('bluebird').promisifyAll(redis.RedisClient.prototype);
        return redis.createClient();
    });
};

const mockDate = () => {
    const DEFAULT_MOCK_DATE = new Date("2019-06-12T03:00:05");
    console.log(`Using date ${DEFAULT_MOCK_DATE} (${DEFAULT_MOCK_DATE.toISOString()}) for testing`);
    require('mockdate').set(DEFAULT_MOCK_DATE);
    return DEFAULT_MOCK_DATE;
};

const mockMetrics = () => {
    setUpMock('../../src/metrics', () => ({ newReminderSet() {}}));
};

const mockTwitterAPI = () => {
    // MITM converts HTTPS requests to HTTP, so we need to do this
    // so we don't get TLS errors on the response
    require('tls').TLSSocket.prototype.getPeerCertificate = detailed => null;

    const Mitm = require("mitm");
    const mitm = Mitm();
    const tweets = [];
    mitm.on("connect", (socket, opts) => {
        if (!opts.host.includes("twitter.com")) socket.bypass();
    });
    mitm.on("request", (req, res) => {
        let rawData = '';
        req.on("data", (chunk) => { rawData += chunk; });
        req.on("end", () => {
            if (req.url.includes("statuses/update")) {
                tweets.push({ url: req.url, body: rawData });
                res.statusCode = 201;
                const tweet = require("./utils").createTweet();
                res.end(JSON.stringify(tweet));
            }
        });
    });
};

const mockNotifications = () => {
    setUpMock('../../src/notifications', () => ({
        sendNotification() { return Promise.resolve(); },
    }));
};

module.exports = {
    mockCache,
    mockDate,
    mockMetrics,
    mockTwitterAPI,
    mockNotifications,
};