# Contribution and Development

## Requirements
- Node.js v12 or later
- A Redis server. You can run one easily with Docker: `docker run --name remindme-redis -d -p 6379:6379 redis redis-server --appendonly yes`
- [Optional] A Redis GUI so you can easily see what's going on in the Redis instance. I recommend [Redis Commander](https://www.npmjs.com/package/redis-commander), but there are [other options](https://redislabs.com/blog/so-youre-looking-for-the-redis-gui/). 
- The Serverless framework: `npm i -g serverless`
- If you're going to use the Sign In With Twitter functionality, you'll need to create a Twitter app at [developer.twitter.com](http://developer.twitter.com). Alternately, you can use the local Twitter mock API (not implemented yet).


## Setting up
1. Clone the repo and install dependencies.
2. Create a `.env` file by copying the `.env.example` file.
3. Set the `TWITTER_CONSUMER_KEY`,`TWITTER_CONSUMER_SECRET`,`TWITTER_ACCESS_TOKEN`, and `TWITTER_ACCESS_TOKEN_SECRET` values in your `.env` file to the values from your Twitter app.
4. Enable 3-legged OAuth on your Twitter app dashboard, and include `http://localhost:3000/_/completetwittersignin` as one of your callback URLs.
5. Ensure your Redis server is running.
6. Uncomment this line in `serverless.yml`:
   ```
   plugins:
   - serverless-dotenv-plugin
   # - serverless-offline <- Remove the #
   ```
7. Start the service by running `npm run local`. This will start all the http functions (accessible from http://localhost:3000) as well as schedule the `checkForRemindersAndSend` function to run every minute.

To trigger a new reminder, run `npm run webhook`. This will trigger a new webhook event containing a reminder tweet (for five minutes from now).

## Tests
Tests are written in Jest, and cover mainly the time parsing features and some end-to-end tests (with the Twitter API mocked to an extent). To run tests: `npm run tests`.

For tests, external services are mocked:
- Redis is mocked with `redis-mock`
- The Twitter API is mocked by using `node-mitm` to intercept APi calls
- CloudWatch Metric calls and Firebase Messaging are mocked to no-ops.

Mocking is mostly done with `jest.mock` for tests.


## Linting
Linting is used to help catch errors: `npm run lint`.