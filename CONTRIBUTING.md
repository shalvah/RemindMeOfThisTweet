# Development and Deployment Guide

*Note: This project is licensed under the [GPLv3](./LICENSE). You may make any modifications you wish to the source code or use it for commercial purposes, as long as your new project is also open source and licensed under the GPLv3.*

## Requirements
- Node.js v14 or later
- The Serverless framework v2: `npm i -g serverless@2`
- A Redis server. You can run one easily with Docker: `docker run --name remindme-redis -d -p 6379:6379 redis redis-server --appendonly yes`
- [Optional] A Redis GUI so you can easily see what's going on in the Redis instance. I recommend [Redis Commander](https://www.npmjs.com/package/redis-commander), but there are [other options](https://redislabs.com/blog/so-youre-looking-for-the-redis-gui/). 

If you want to use push notifications, you'll also need:
- A [Google Firebase Project](https://console.firebase.google.com/) and service account (_Project Settings_ > _Service Accounts_). Download a JSON key file for this service account and place it in the root of the project as `remindmeofthistweet-serviceaccount.json`. This file should not be added to Git.

If you're going to use the Twitter-specific functionality, you'll also need:
- A Twitter account. This will be your bot's account. Set the `TWITTER_SCREEN_NAME` env var to your account's handle (without the `@`).
- Twitter app credentials. Create a Twitter app at [developer.twitter.com](http://developer.twitter.com), and get your credentials, and save to your env:
  ```
  TWITTER_CONSUMER_KEY=<value>
  TWITTER_CONSUMER_SECRET=<value>
  TWITTER_ACCESS_TOKEN=<value>
  TWITTER_ACCESS_TOKEN_SECRET=<value>
  ```
  Notes:
  - Make sure you're logged in as your bot account.
  - By default, Twitter only gives you the consumer key and consumer secret (also called "api key" and "api secret"). You'll need to click the button to generate the access tokens.
  - Make sure to enable Sign In With Twitter. This will probably require you to add one or more callback URLs. Set this to `http://localhost:3000/_/completetwittersignin`. Later on, when you've deployed your service, you can add the deployed URL for your app, eg `http://xxx.execute-api.aws.amazon.com/dev/RemindMeOfThisTweet/_/completetwittersignin`.


## Setting up
1. Clone the repo and install dependencies (`npm ci --production=false`).
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

- To trigger a new reminder, run `npm run reminder`. This will trigger a fake webhook event containing a reminder tweet (for ten minutes from now) and pass it to the `handleAccountActivity` function, so it looks like it came from the actual Twitter API.

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

## Deployment
### Prerequisites
You'll need some infrastructure and credentials set via env variables (in `.env` file or your deployment environment). First, see the [Requirements](#requirements) section above.

When you've got those, you'll also need:
- a remote Redis server. I recommend a SaaS like ScaleGrid or Redis Labs, but you can self-host, if you prefer (as long as you secure it properly). Those credentials should become the environment variables `REDIS_HOSTNAME`, `REDIS_PORT`, and `REDIS_PASSWORD`.
- an AWS account. You can follow [this guide from Serverless](https://www.serverless.com/framework/docs/providers/aws/guide/credentials/) to get the needed credentials and add them to your deployment environment.

Some final notes:
- Remember that your service account should not be in Git. If you need to deploy via CI/CD, you  can store the service account in S3 or some other service and download it to your repo during the deployment. See our [GitHub Actions workflow](./.github/workflows/deploy.yml) for an example.
- Remove the `remind` entry in `serverless.yml` (the one that has `handler.remind`). It's from a deprecated function that's no longer used.
- Don't forget to copy the `completeTwitterSignIn` handler's deployed URL and add to your Twiter app's callback URLs, otherwise your users will be getting redirected to localhost.
- Also, you should double-check the AWS region in the `serverless.yml` file. It's currently set to `us-east-1`, but you should probably change it (there are way too many people on `us-east-1`🙄).

### Deploying a new service
If you're starting from scratch (ie not updating an existing service), run `serverless deploy` to deploy. When the deployment is complete, the details of your functions, such as their URLs, will be printed to the terminal. You can also manahe your functions from the AWS Lambda console.

One important thing: for the `handleAccountActivity` handler to be called by Twitter when there are new mentions, you'll need to create a webhook subscription. There are a few scripts to make it easy for you:
- First, you'll need to create a dev environment at [https://developer.twitter.com/en/account/environments](https://developer.twitter.com/en/account/environments). Name it whatever you like. Note that the [Account Activity API](https://developer.twitter.com/en/docs/twitter-api/enterprise/account-activity-api/overview) is part of the Enterprise API, but don't worry—the first environment is free.

Assuming your environment name is "myenv", and your deployed `webhook` handler's URL is`https://hds3097.execute-api.us-west-2.amazonaws.com/dev/webhook`:
- Run `node bin\create_webhook.js myenv https://hds3097.execute-api.us-west-2.amazonaws.com/dev/webhook` to create a new webhook
- Run `node bin\create_subscription.js myenv https://hds3097.execute-api.us-west-2.amazonaws.com/dev/webhook` to subscribe that webhook to events on your user account (like mentions)

You can then run `node bin\get_webhooks.js` and `node bin\get_subscriptions.js` to check your active subscriptions. 

Note that your service must be deployed already, as Twitter will try to perform a CRC check on the webhook URL. It should work if all the functions have been deployed correctly. Read more about the whole webhook thingy [on the Twitter docs](https://developer.twitter.com/en/docs/twitter-api/enterprise/account-activity-api/quick-start/enterprise-account-activity-api).

### Updating an existing service
To update an already deployed Serverless function, run `serverless deploy`.

The deployed URL remains the same.
