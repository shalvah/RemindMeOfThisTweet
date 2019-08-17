'use strict';

const redis = require("redis");
require('bluebird').promisifyAll(redis.RedisClient.prototype);

async function init() {
    let client = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOSTNAME, {
        no_ready_check: true,
        retry_strategy: (options) => {
            if (options.error && options.error.code === 'ECONNREFUSED') {
                // End reconnecting on a specific error and flush all commands with
                // a individual error
                return new Error('The server refused the connection');
            }
            if (options.total_retry_time > 1000 * 10) {
                // End reconnecting after  and flush all commands
                // with a individual error
                return undefined;
            }
            if (options.attempt > 5) {
                // End reconnecting with built in error
                return undefined;
            }
            // reconnect after 1.5s
            console.log("RETRY: Reconnecting in 1.5s");
            return 1500;
        }
    });
    client.on('error', function (err) {
        if (err instanceof redis.ReplyError) {
            console.log(`Redis error: ${err.command} ${err.args} ${err}`);
        }
        throw err;
    });
    await client.authAsync(process.env.REDIS_PASSWORD);
    return client;
}

module.exports = init;
