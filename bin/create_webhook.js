const request = require('request-promise');
const args = process.argv.splice(2);

require('dotenv').config('../.env');

// first arg is environment name
// second argument is webhook url

const options = {
    url: 'https://api.twitter.com/1.1/account_activity/all/' + args[0] + '/webhooks.json',
    oauth: {
        consumer_key: process.env.TWITTER_CONSUMER_KEY,
        consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
        token: process.env.TWITTER_ACCESS_TOKEN,
        token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
    },
    headers: {
        'Content-type': 'application/x-www-form-urlencoded'
    },
    form: {
        url: args[1]
    }
};


request.post(options)
    .then(console.log)
    .catch(console.log);
