importScripts('https://www.gstatic.com/firebasejs/6.6.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/6.6.1/firebase-messaging.js');

const firebaseConfig = {
    apiKey: "AIzaSyB6sEFuSmpYOvSa6ZHNqKmG2-0ML26b1EY",
    authDomain: "remindmeofthistweet.firebaseapp.com",
    projectId: "remindmeofthistweet",
    messagingSenderId: "183640492360",
    appId: "1:183640492360:web:a4206135929aca46e0cb7d"
};
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.setBackgroundMessageHandler((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  return self.registration.showNotification(payload.data.title,
      {body: payload.data.body, data: { url: payload.data.url}});
});

self.addEventListener('notificationclick', function(e) {
    const notification = e.notification;

    clients.openWindow(notification.data.url);
    notification.close();

});