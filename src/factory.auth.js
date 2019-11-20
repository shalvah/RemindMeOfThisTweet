"use strict";

module.exports = (cache) => {

    const createSession = (user) => {
        const sessionId = require('crypto').randomBytes(16).toString('base64');
        const sessionData = {
            username: user.screen_name,
            id: user.id_str,
        };
        return cache.setAsync(`sessions-${sessionId}`, JSON.stringify(sessionData), 'EX', 60 * 60 * 24 * 7)
            .then(() => sessionId);
    };

    const session = (event) => {
        const cookie = event.headers.Cookie || event.headers.cookie;
        if (!cookie) {
            return null;
        }
        const matched = cookie.match(/\brmotid=([^;\s]+)/);
        if (!matched) {
            return null;
        }

        const sessionId = matched[1];
        if (!sessionId) {
            return null;
        }
        return cache.getAsync(`sessions-${sessionId}`)
            .then(JSON.parse);
    };

    return {
        createSession,
        session
    };
};