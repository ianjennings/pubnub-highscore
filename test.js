const pnhs = require('./index.js');
const PubNub = require('pubnub');

let pubnub = new PubNub({
    subscribeKey: "demo",
    publishKey: "demo"
});

let highscore = pnhs.init();
highscore.identifyGlobal('tester', 'this is a test');

setInterval(() => {

    pubnub.publish({
        channel: 'tester',
        message: 'test'
    });

}, 1000);
