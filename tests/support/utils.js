'use strict';

const createWebhookEvent = (body) => {
    return ({body: JSON.stringify(body)});
};

const createUser = (username = null, id = null) => {
    return {
        id: id || 6253282,
        id_str: id || "6253282",
        name: "Rando dude",
        screen_name: username || "rando_dude12",
        description: "Meh",
        protected: false,
        utc_offset: null,
        time_zone: null,
    };
};

const createTweetCreateEvent = (tweet) => {
    return {
        for_user_id: '78564765',
        tweet_create_events:
            [tweet]
    }
};

const createTweet = ({ username = null, text = null, inReplyTo = null, retweetedTweet = null, date = new Date} = {}) => {
    username = username || 'rando_dude12';
    text = text || `@${username} Hehe, random.`;
    text = inReplyTo ? `@${inReplyTo.user} ${text}` : text;
    return {
        created_at: require('moment')(date).format('ddd MMM D HH:mm:ss ZZ YYYY'), // something like 'Sun Sep 22 11:48:59 +0000 2019'
        id: 8759849726758343547627,
        id_str: '8759849726758343547627',
        text,
        display_text_range: [],
        truncated: false,
        in_reply_to_status_id: inReplyTo ? 34788 : null,
        in_reply_to_status_id_str: inReplyTo ? inReplyTo.id : null,
        in_reply_to_user_id: inReplyTo ? 5499273 : null,
        in_reply_to_user_id_str: inReplyTo ? '5499273' : null,
        in_reply_to_screen_name: inReplyTo ? inReplyTo.user : null,
        user: createUser(username, '78564765'),
        is_quote_status: false,
        retweeted_status: retweetedTweet,
        lang: 'en',
        timestamp_ms: '1569152939970'
    }
};

const createRetweet = (opts = {}) => {
    opts.retweetedTweet = createTweet();
    return createTweet(opts);
};

module.exports = {
    createTweet,
    createRetweet,
    createTweetCreateEvent,
    createUser,
    createWebhookEvent,
};