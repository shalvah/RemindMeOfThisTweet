'use strict';

const firebase = require('firebase-admin');
let serviceAccount;
try {
    serviceAccount = require("../remindmeofthistweet-serviceaccount.json");
} catch (e) {
    if (process.env.NODE_ENV === "development") {
        console.log("Firebase service account remindmeofthistweet-serviceaccount.json not found; mocking notifications...");
        module.exports = {
            sendNotification() {
                return Promise.resolve();
            },
        };
        return;
    }

    throw e;
}

firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,

});

module.exports = {
    async sendNotification(token, username, tweetUrl) {
        const message = {
            data: {
                title: `Here's your reminder, @${username}.👋`,
                body: `You set this reminder with @RemindMe_OfThis. Tap to view the tweet.`,
                url: tweetUrl,
            },
            token
        };

        return firebase.messaging().send(message)
            .then((response) => {
                console.log('notification.send.success:' + JSON.stringify(response));
            })
            .catch((error) => {
                console.log('notification.send.error:' + JSON.stringify(error));
            });
    }
};