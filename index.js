const fs = require('fs').promises;
const {
    google
} = require('googleapis');
var admin = require("firebase-admin");

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 */
async function authorize() {

    try {

        const file = await fs.readFile('credentials.json');
        const credentials = JSON.parse(file);

        const {
            client_secret,
            client_id,
            redirect_uris
        } = credentials.installed;

        const oAuth2Client = new google.auth.OAuth2(
            client_id, client_secret, redirect_uris[0]);

        const token = await fs.readFile(TOKEN_PATH);
        oAuth2Client.setCredentials(JSON.parse(token));

        return oAuth2Client;
    } catch (error) {
        console.log(error);
    }
}


// Call once every 4 days to continue subscription to gmail 
exports.subscribe = async (req, res) => {
    try {
        const auth = await authorize();
        console.log(auth);
        const gmail = google.gmail({
            version: 'v1',
            auth,
        });

        await gmail.users.stop({
            userId: 'me',
        });
        const watch = await gmail.users.watch({
            userId: 'me',
            requestBody: {
                topicName: `projects/quickstart-1569723397848/topics/gmail-venmo-api`,
            },
            labelIds: [
                'Label_5771775253713101890',
            ],
        });
        console.log(watch.data);
        return true;
    } catch (error) {
        console.error(error);
    }
};

exports.venmo = async (event, context) => {
    try {
        // const pubsubMessage = event.data;
        // const msg = JSON.parse(Buffer.from(pubsubMessage, 'base64'));
        // const msg = JSON.parse(Buffer.from(pubsubMessage));
        const auth = await authorize();
        const gmail = google.gmail({
            version: 'v1',
            auth
        });

        // if (!msg.historyId || !msg.emailAddress) return;

        const list = await gmail.users.messages.list({
            'userId': "me",
            "maxResults": 1,
        });

        const messageId = list.data.messages[0].id;
        const {
            amount,
            name
        } = await parseMessage(messageId, gmail);
        console.log(amount);

        if (amount <= 0) return;

        const file = await fs.readFile('service.json');
        const credentials = JSON.parse(file);

        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(credentials),
                databaseURL: "https://quickstart-1569723397848.firebaseio.com"
            });
        }

        const db = admin.firestore();

        const transaction = db.collection('payments').doc(messageId);

        await transaction.set({
            messageId,
            amount,
            name,
            created: admin.firestore.Timestamp.fromDate(new Date())
        });

        return amount;
    } catch (error) {
        console.error(error);
    }
};

async function parseMessage(messageId, gmail) {
    try {
        const result = await gmail.users.messages.get({
            'userId': "me",
            'id': messageId,
            'format': "metadata"
        });

        const headers = result.data.payload.headers;
        let subject = "";
        for (let i in headers) {
            const header = headers[i];
            if (header.name == "Subject") {
                subject = header.value;
                break;
            }
        };

        if (subject.lastIndexOf("$") == -1) return false;

        const pos = subject.lastIndexOf("$");
        const amount = parseFloat(subject.substring(pos + 1, subject.length));
        const name = subject.split(" paid you")[0]
        return {
            amount,
            name
        };
    } catch (error) {
        console.error(error);
    }
}

exports.venmo({
    // data: JSON.stringify(obj)
});

// exports.subscribe({
//     // data: JSON.stringify(obj)
// });