const request = require('request-promise');
const args = process.argv.splice(2);

require('dotenv').config('../.env');

const options = {
    url: 'https://api.twitter.com/1.1/account_activity/all/' + args[0] + '/subscriptions.json',
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
    },
    resolveWithFullResponse: true
};


request.post(options)
    .then(response => {
        console.log('HTTP response code:', response.statusCode);

        if (response.statusCode == 204) {
            console.log('Subscription added.');
        }
    })
    .catch(response => {

        console.log('Subscription was not able to be added.');
        console.log('- Verify environment name.');
        console.log('- Verify "Read, Write and Access direct messages" is enabled on apps.twitter.com.');
        console.log('Full error message below:');
        console.log(response.error);
    });
