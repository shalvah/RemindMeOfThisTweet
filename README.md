# RemindMeOfThisTweet

### The Problem

Some guy on Twitter tweets:

> In three years, humans will have established a colony on Uranus.


And of course, naturally, you want to check back in three years to see if he was right. But you likely won't remember by that time.

### The Solution

Just tweet:

> @RemindMe_OfThis in three years


![Reminder request screenshot](assets/reminder-request.png)

And when the time is right:


![Reminder screenshot](assets/reminder.png)


Of course, that's not all you can do! You can set reminders for your own tweets (New Year's Resolutions, anyone?👀), too, for instance.

Note that the bot will assume all absolute times are in UTC, so if you want to specify an absolute time, you need to specify a timezone if you're not in UTC/GMT. For instance, "11:30 pm WAT" (West African Time), "10:20 am UTC+0300", "10:20 am GMT-0900". Better yet, sign in on https://remindmeofthis.app and set your timezone.🙂

> PS: I also made [@this_vid](https://github.com/shalvah/DownloadThisVideo)!

## How This Works
### Stack
- [AWS Lambda](https://aws.amazon.com/lambda/) with the [Serverless Framework](http://serverless.com)
- Firebase Messaging for push notifications
- [Redis](http://redis.io) for data storage
- Node.js 10.x
- [Chrono](https://github.com/wanasit/chrono) for parsing dates/times from text

### Implementation
The bot uses a number of AWS Lambda functions that work in tandem:

#### `handleAccountActivity`
This function serves as the webhook registered to Twitter's [Accout Activity API](https://developer.twitter.com/en/docs/accounts-and-users/subscribe-account-activity/overview). Whenever anyone mentions the bot (or likes or retweets a tweet by the bot), Twitter hits this URL with a payload containing details of the events.

This function iterates through all the mentions and looks for any possible reminder requests (or reminder cancellations). If it finds any requests, it sets a reminder by storing the relevant data (tweet, author, etc) in Redis, with the Redis key being the timestamp (ISO8601—can't remmber why I went with that instead of the UNIX timestamp, but possibly human-readability). 

Cancellations (reply "cancel" to the bot's reply) work by storing a Redis entry with the reminder request tweet ID as value and the ID of the bot's response as key. SO when a user replies cancel to a Tweet, we look up the ID of the tweet they're replying to, fetch their original reminder Tweet from there, and then delete th reminder from that Tweet from the datetime-key containing it in Redis.

#### `checkForRemindersAndSend`
This function runs once every minute (this means reminders can only have minute precision) and checks for any reminders scheduled for the current time. Assuming the time is 2019-05-03, 11:23, it will check for a Redis key 2019-05-03T11:23:00Z, which should hold all the reminders for that time. Then it iterates over them and dispatches any tweets or push notifications.

#### `getHomePage`
Renders the home page of http://remindmeofthis.app

#### `getPage`
Renders all other pages on http://remindmeofthis.app. Why are `getHomePage` and `getPage` separate, you ask? I honestly do not remember. Maybe I wasn't sure if I could make path parameters optional.🤔

#### `startTwitterSignIn`
When you click "Sign in With Twitter" on the website, you're redirected to the URL of this function. It retrieves the necessary tokens and passes on to Twitter API to start [the sign in process](https://developer.twitter.com/en/docs/basics/authentication/guides/log-in-with-twitter).

#### `completeTwitterSignIn`
The URL Twitter redirects you to after you complete the sign in process. This function fetches your profile info from the Twitter API and creates a session for you on the website.

#### `updateSettings`
HTTP handler that the form submits to when you update your settings on the website (set a timezone or enable/disable push notifications). Settings are stored in redis, with the user's Twitter handle forming part of the key.

#### `handleTwitterCrc`
These are utility functions used only once: when verifying the webhook for Twitter (during setup). See [here](https://developer.twitter.com/en/docs/accounts-and-users/subscribe-account-activity/guides/securing-webhooks).

#### `retryFailedTasks`
This re-publishes failed tasks (stored in Redis) and attempts to set reminders for them. It can only be triggered manually.



This architecture isn't perfect, and I'm open to criticism and suggestions. It's unlikely I'll change things much (because time, work, etc), but I'm interested in hearing your thoughts.


## Development
See the [contributing and development guide](./CONTRIBUTING.md) for details on working on this project.