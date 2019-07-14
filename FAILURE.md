# Failure strategy

## Stopping the service/functions
The main reason for this is to avoid spamming the Twitter API when there are errors (and thus getting banned).

### The nuclear option

```bash
serverless remove
```

### The non-nuclear way
1. Disable the CloudWatch rule for `checkForRemindersAndSend`


## Rolling back to a previous release
1. Find the build corresponding to the commit on Travis CI. Click "Restart Build".

