
module.exports = (cache) => {
    return {
        /**
         *
         * @param username
         * @returns {Promise<{utcOffset: number, notifications: {fbtoken: null, enabled: boolean}}>}
         */
        async getUserSettings(username){
            const defaultUserSettings = {
                utcOffset: 0,
                notifications: {
                    enabled: false,
                    fbtoken: null,
                },
            };
            return JSON.parse(await cache.getAsync(`settings-${username}`)) || defaultUserSettings;
        },

        setUserSettings(username, settings){
            return cache.setAsync(`settings-${username}`, JSON.stringify(settings));
        },
    }
};