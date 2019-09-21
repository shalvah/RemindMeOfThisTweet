const request = require('request-promise');
const args = process.argv.splice(2);

require('dotenv').config('../.env');

// first arg is environment name

const options = {
    url: 'https://api.twitter.com/1.1/account_activity/all/' + (args[0]  || 'dev1') + '/subscriptions/list.json',
    oauth: {
        consumer_key: process.env.TWITTER_CONSUMER_KEY,
        consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    },
};


request.get(options)
    .then(console.log)
    .catch(console.log);
