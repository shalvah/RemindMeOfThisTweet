'use strict';

const finish = (cb, cache = null) => {
    if (cache) cache.quit();

    return {
        success(body) {
            console.log(`Response: ${body}`);
            const response = {
                statusCode: 200,
                body
            };
            cb(null, response);
        },

        fail(body) {
            console.log(`Fail response: ${body}`);
            cb(body);
        },

    }
};

const randomSuccessResponse = (username) => {
    let responses = [
        "Yay, video! Check for your download link at {link}.\n\nNote: I may not always show this message in the future, so just check that link whenever you make a new download request.🤗🤗",
        "Your video is ready! Your download link: {link}.\n\nNote: I may not always show this message in the future, so check that link whenever you make a new download request.🤗",
    ];
    let response = responses[Math.floor(Math.random() * responses.length)];
    return response.replace('{link}', `http://${process.env.EXTERNAL_URL}/${username}`);
};

class TwitterErrorResponse extends Error {
    constructor(endpoint, errors) {
        super('Error from Twitter API call');
        this.name = 'TwitterErrorResponse';
        this.errors = errors;
        this.endpoint = endpoint;
    }
}

const SUCCESS = 'Success';

const FAIL = 'Fail';

const UNCERTAIN = 'Uncertain';

module.exports = {
    randomSuccessResponse,
    finish,
    TwitterErrorResponse,
    SUCCESS,
    FAIL,
    UNCERTAIN
};
