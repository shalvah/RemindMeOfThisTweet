'use strict';

const firebase = require('firebase-admin');
const serviceAccount = require("../remindmeofthistweet-serviceaccount.json");
firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,

});

module.exports = {
    async sendNotification(token, username, url) {
        const message = {
            data: {
                title: `Here's your reminder, @${username}.👋`,
                url,
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