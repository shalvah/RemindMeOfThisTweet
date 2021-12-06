# Development

## Requirements
- Node.js v14 or later
- The Serverless framework: `npm i -g serverless@2`
- A Redis server. You can run one easily with Docker: `docker run --name remindme-redis -d -p 6379:6379 redis redis-server --appendonly yes`
- [Optional] A Redis GUI so you can easily see what's going on in the Redis instance. I recommend [Redis Commander](https://www.npmjs.com/package/redis-commander), but there are [other options](https://redislabs.com/blog/so-youre-looking-for-the-redis-gui/). 
- If you're going to use the Sign In With Twitter functionality, you'll need to create a Twitter app at [developer.twitter.com](http://developer.twitter.com). Alternately, you can use the local Twitter mock API (not implemented yet).


## Setting up
1. Clone the repo and install dependencies (`npm i`).
2. Create a `.env` file by copying the `.env.example` file.
3. Set the `TWITTER_CONSUMER_KEY`,`TWITTER_CONSUMER_SECRET`,`TWITTER_ACCESS_TOKEN`, and `TWITTER_ACCESS_TOKEN_SECRET` values in your `.env` file to the values from your Twitter app.
4. Enable 3-legged OAuth on your Twitter app dashboard, and include `http://localhost:3000/_/completetwittersignin` as one of your callback URLs.
5. Ensure your Redis server is running on localhost:6379. If you're using a remote Redis instance, you can update the `REDIS_*` variables in `.env` instead.
6. Start the service by running `npm run local`. This will start all the http  lambda functions (accessible from http://localhost:3000) as well as schedule the `checkForRemindersAndSend` function to run every minute.

## Directory structure
- The `assets` folder contains assets used on the website, remindmeofthis.app. Mostly favicons and images, and a service worker for Firebase Messaging push notifications.
- The `bin` folder contains scripts for certain one-off tasks involving the Twitter API, essentially scripts to create and manage a webhook subscription.
- `runbooks` also contains scripts, but for more common tasks, like triggering a fake webhook for manual testing.
- `src` and `tests`: duh
- `views` contains HTML and Handlebars files used for the website

## Manual testing
To test the service manually, you'll probably want to run `npm run local` first to start up all the functions locally. Then:

- To trigger a new reminder, run `npm run reminder`. This will trigger a fake webhook event containing a reminder tweet (for five minutes from now) and pass it to the `handleAccountActivity` function, so it looks like it came from the actual Twitter API.

## Automated tests
Tests are written in Jest (the `tests/` folder). The unit tests cover the time parsing features and behaviour of the service, while the integration tests test behaviour from when a webhook is received (with the Twitter API mocked to an extent).

To run tests: `npm test` (or `npm run test:unit` for unit tests only).

External services are mocked:
- Redis is mocked with `redis-mock`
- The Twitter API is mocked by using `node-mitm` to intercept APi calls
- CloudWatch Metric calls and Firebase Messaging are mocked to no-ops, via`jest.mock()` and `mock-require`
- the current Date is faked with `mockdate`

## Linting
Linting is used to help catch errors: `npm run lint`.