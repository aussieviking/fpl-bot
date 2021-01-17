import "dotenv/config"
import { App, LogLevel, ExpressReceiver } from '@slack/bolt'
import axios from 'axios'

const receiver = new ExpressReceiver({ signingSecret: process.env.SLACK_SIGNING_SECRET ?? "" });

const app = new App({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    token: process.env.SLACK_BOT_TOKEN,
    logLevel: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
    receiver
});


// Other web requests are methods on receiver.router
receiver.router.get('/foo', async (req, res) => {
    // You're working with an express req and res now.
    var deadline = await getDeadline();
    res.json({foo: deadline});
});

app.message('hello', async ({
    message, say
}) => {
    await say(`Hey there <@${message.user}>!`);
});

app.command('/fpl', async ({ command, ack, say }) => {
    // Acknowledge command request
    await ack();

    var subCommand = command.text.split(" ")[0];

    var reply = '';
    switch (subCommand.toLowerCase()) {
        case 'deadline':
            say(await getDeadline());
            break;
        default: await say('Unknown command');
    }

    // await say(reply);
});

async function getDeadline() : Promise<string> {

    // required as otherwise we get an empty result
    axios.defaults.headers.common['User-Agent'] = 'PostmanRuntime/7.26.2';

    interface FplData {
        teams: Team[],
        events: Event[],
    }

    interface Team {
        name: string,
    }

    interface Event {
        deadline_time: string,
        deadline_time_epoch: number,
        finished: boolean,
        is_current: boolean
    }

    interface Standings {
        league: LeagueInfo,
    }

    interface LeagueInfo {
        name: string,
    }

    var reply = '';
    // axios.get<Standings>('https://fantasy.premierleague.com/api/leagues-classic/83363/standings/')
    var response = await axios.get<FplData>('https://fantasy.premierleague.com/api/bootstrap-static/');
        //.then(function (response) {

    var nextGameweek = response.data.events.find((event) => { return !event["finished"] && !event["is_current"] });
    var utcDeadline = new Date(nextGameweek!["deadline_time"]);

    var dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    var deadlineDate = utcDeadline.toLocaleString('en-AU', dateOptions);
    var timeOptions = { hour: 'numeric', minute: 'numeric', timeZone: 'Australia/Melbourne' };
    var deadlineTime = utcDeadline.toLocaleString('en-AU', timeOptions).toUpperCase();

    // var today = new Date(new Date().setHours(0, 0, 0, 0));
    var hours = Math.abs(utcDeadline.valueOf() - new Date().valueOf()) / 36e5;

    // is deadline in less than one hour?
    if (hours < 1) {
        var minutes = Math.ceil(hours * 60);
        reply = 'The next deadline is today, in ' + minutes + ' minutes!! (' + deadlineTime + ')';
    }
    // is deadline today?
    else if (hours < 12) {
        reply = 'The next deadline is today, in less than ' + Math.ceil(hours) + ' hours! (' + deadlineTime + ')';
    }
    else {
        reply = 'The next deadline is on ' + deadlineDate + ' @ ' + deadlineTime;
    }

    return reply;
        //});

    //return reply;
}

(async () => {
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running!');
})();
