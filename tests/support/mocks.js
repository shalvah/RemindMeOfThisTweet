"use strict";

const mockCache = () => {
    jest.mock("../../src/cache", () => {
        const redis = require("redis-mock");
        require('bluebird').promisifyAll(redis.RedisClient.prototype);
        return redis.createClient();
    });
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
    jest.mock('../../src/metrics', () => ({ newReminderSet() {}}));
};

const mockTwitterAPI = () => {
    const tls = require('tls');
    // MITM converts HTTPS requests to HTTP, so we need to do this
    // so we don't get TLS errors on the response
    tls.TLSSocket.prototype.getPeerCertificate = detailed => null;
    const Mitm = require("mitm");
    const mitm = Mitm();
    const requests = [];
    mitm.on("connect", (socket, opts) => {
        if (!opts.host.includes("twitter.com")) socket.bypass();
    });
    mitm.on("request", (req, res) => {
        let rawData = '';
        req.on("data", (chunk) => { rawData += chunk; });
        if (req.url.includes("statuses/update")) {
            req.on("end", () => {
                requests.push({ url: req.url, body: rawData });
                res.statusCode = 201;
                const tweet = require("./utils").createTweet();
                res.end(JSON.stringify(tweet));
            });
        }
    });
    return requests;
};

const mockNotifications = () => {
    jest.mock('../../src/notifications', () => ({
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