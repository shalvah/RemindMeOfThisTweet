"use strict";

module.exports = (cache) => {

    const createSession = (user) => {
        const sessionId = require('crypto').randomBytes(16).toString('base64');
        const sessionData = {
            userame: user.screen_name,
            id: user.id_str,
        };
        return cache.setAsync(`sessions-${sessionId}`, JSON.stringify(sessionData), 'EX', 60 * 60 * 24 * 7)
            .then(() => sessionId);
    };

    const session = (event) => {
        const cookie = event.headers.cookie || event.headers.Cookie;
        const sessionId = cookie.match(/id=([^;\s]+)/)[1];
        return cache.getAsync(`sessions-${sessionId}`)
            .then(JSON.parse);
    };

    return {
        createSession,
        session
    };
};