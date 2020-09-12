# gumball-cloud
Files for Gmail subscription and Pub/Sub Triggers

## Gumball Trigger 

1. Email is sent with Venmo transaction information.
2. Gmail API publishes to Pub/Sub
3. Pub/Sub triggers Cloud Function
4. Cloud Function publishes data to Firebase (Firestore).

## Gmail Subscription

Runs every 4 days. Cloud Scheduler triggers Cloud Function which runs the Gmail + Pub/Sub subscribe function.

## Gumball Client

Not in this Repo.

1. Reads in Firestore insert.
2. Runs Gumball Servo Code (not in this repo).
3. Dispenses a gumball
4. Repeat

