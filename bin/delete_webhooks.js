const request = require('request-promise');
const args = process.argv.splice(2);

require('dotenv').config('../.env');


// first arg is environment name

const options = {
    url: 'https://api.twitter.com/1.1/account_activity/all/' + args[0] + '/webhooks.json',
    oauth: {
        consumer_key: process.env.TWITTER_CONSUMER_KEY,
        consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
        token: process.env.TWITTER_ACCESS_TOKEN,
        token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
    },
};

request.get(options)
    .then(body => {
        let webhookId = JSON.parse(body)[0].id;

        console.log('Deleting webhook config:', webhookId);

        const options = {
            url: 'https://api.twitter.com/1.1/account_activity/all/' + args[0] + '/webhooks/' + webhookId + '.json',
            oauth: {
                consumer_key: process.env.TWITTER_CONSUMER_KEY,
                consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
                token: process.env.TWITTER_ACCESS_TOKEN,
                token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
            },
            resolveWithFullResponse: true,
        };
        return request.delete(options);
    })
    .then(r => {
        console.log('HTTP response code:', r.statusCode);

        if (r.statusCode == 204) {
            console.log('Webhook config deleted.')
        }
    })
    .catch(console.log);
