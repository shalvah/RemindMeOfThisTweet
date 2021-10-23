When building a Twitter bot, it's easy to get restricted (your account is locked, can't post tweets), shadow-banned (users can't see your replies) or banned outright. Twitter's spam/bot detection is really gucked up. You have to take extreme care. Read through their policies (linked below) to ensure that you're in compliance and try these tips.

Even then, they'll probably still shadowban you and lock your account a couple of times, without any notice. I recommend you set up alerting so you get an alert when your account is locked. For instance, with my library [twitter-error-handler](https://github.com/shalvah/twitter-error-handler), you can do

```js
const {wrapTwitterErrors, errors} = require('twitter-error-handler');
return t.get(endpoint, options)
    .catch(e => wrapTwitterErrors(e, 'statuses/mentions_timeline'))
    .catch(e => {
        if (e instanceof errors.ProblemWithAuth) {
            // uh-oh, your token is wrong, do stuff
        } else if (e instanceof errors.ProblemWithAppOrAccount) {
            // Your account was locked!
            
            // Rethrow this type of error so your app crashes 
            // and your error handler (eg Sentry) alerts you/
            throw e;
            
            // Or notify yourself manually (not recommended)
            notifyMe();
        } else if (e instanceof errors.RateLimited) {
            // implement a backoff so Twitter doesn't suspend your app
            // Example:
            console.log(`Error: ${e.code}, backing off for 10 minutes`);
            await redis.setAsync('limit-${endpoint}', 1, 'EX', 60 * 10);
        }
    })
```

For shadowbanning, there's really nothing you can do. Just hope, I guess🤷‍♀️. You can check out my own code interacting with Twitter here: [@RemindMe_OfThis](https://github.com/shalvah/RemindMeOfThisTweet/blob/master/src/factory.twitter.js) and [@this_vid](https://github.com/shalvah/DownloadThisVideo/blob/master/src/services/factory.twitter.js).

## Twitter Policies
- [https://help.twitter.com/en/rules-and-policies/twitter-rules#spam-security]()
- [https://developer.twitter.com/en/developer-terms/agreement-and-policy.html#ii-restrictions-on-use-of-licensed-materials]()

## Tips
- Don't send Tweets consisting of links without commentary
- Randomize messages (don't send suplicate or substantially similar messages)
- Avoid sending unsolicited mentions. Make sure to **only reply the user who mentioned you**. Use `in_reply_to_status_id` properly and ensure your tweet is in this format. `@<user_who_mentioned_you> your_content`.
- Implement backoff for  rate limits. If the API response says you've hit your rate limit, back off.
- Not API related, but NEVER set a birth date in your bot's profile. It'll be instantly banned, because it's less than 15 years.
