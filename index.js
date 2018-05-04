const chalk = require('chalk');
const winston  = require('winston');
const globalLog = require('global-request-logger');
const url = require('url');

require('winston-loggly-bulk');

module.exports = {
    init: function(config = {}) {

        let self = {};

        if(config.logglyKey) {

            winston.remove(winston.transports.Console);

            winston.add(winston.transports.Loggly, {
                token: config.logglyKey,
                subdomain: "chatengine",
                tags: ["Winston-NodeJS"],
                json:true
            });

        }

        self.globalTestNameMap = {};

        self.identifyGlobal = (globalName, title) => {

            self.globalTestNameMap[globalName] = title;

            let now = new Date().getTime();
            let hour = 60 * 60 * 1000;
            var when = new Date(now - hour);

            console.log('This test can be found at:\n' + 'https://chatengine.loggly.com/search#terms=json.global:'+globalName+'&from=' + when.toISOString());
            console.log('Loggly has a substantial delay. Wait a minute after test completion for full report');
            console.log(' ');
            console.log(' ');
            console.log('-------');

        };

        self.output = (csv) => {
            console.log('output!')
            console.log(self.report)
        };

        self.report = {};

        function hashCode(str) { // java String#hashCode
            var hash = 0;
            if(str) {

                for (var i = 0; i < str.length; i++) {
                   hash = str.charCodeAt(i) + ((hash << 5) - hash);
                }

                return hash;

            } else {
                return 'FFFFFF';
            }
        }

        function intToRGB(i){
            var c = (i & 0x00FFFFFF)
                .toString(16)
                .toUpperCase();

            return "00000".substring(0, 6 - c.length) + c;
        }

        let colorHashOutput = (i) => {
            return chalk.hex('#' +intToRGB(hashCode(i)))(i);
        }

        globalLog.initialize();

        globalLog.on('success', function(request, response) {

          let o = {request};

          o.body = request.body && JSON.parse(request.body);
          o.query = url.parse(request.path, true).query;

          let channel = o.query.channel || o.body.channel;

          if(channel) {
            if(typeof channel == 'object') {
              channel = channel[0];
            }
            o.channel = channel.split('#');
          }

          o.global = o.query.global || o.body.global || o.channel && o.channel[0];

          o.path = o.request.path.replace('/', '').split('/');

          o.service = o.path[1];

          o.response = response.body;

          o.test = self.globalTestNameMap[o.global];

          if(o.path[0] == 'publish') {
            o.service = 'publish';
            o.global = o.path[4].split('%23')[0];
          }

          if(!o.global) {

            let channelGroups = o.query['channel-group'] && o.query['channel-group'].split(',');

            if(channelGroups) {
                o.channelGroups = channelGroups;
                o.global = channelGroups[0].split('#')[0];
            }

          }

          if(!o.global) {
            o.global = o.path && o.path[5] && o.path[5].split('?')[0];
          }

          if(o.service === 'blocks') {
            o.segment = o.query.route;
          }

          if(o.service == 'presence') {

            if(o.query.state) o.segment ='state';
            if(o.query.heartbeat) o.segment ='heartbeat';

            o.global = o.global.split('%23')[0];

          }

          if(o.service == 'subscribe') {
            if(o.query.heartbeat) o.segment = 'heartbeat';
          }

          if(o.request.hostname || o.request.host && o.request.host.indexOf('loggly') === -1) {

            self.report[self.globalTestNameMap[o.global]] = self.report[self.globalTestNameMap[o.global]] || {};


            let name = o.service;
            if(o.segment) {
              name = [o.service, o.segment].join('.');
            }

            self.report[self.globalTestNameMap[o.global]][name] = self.report[self.globalTestNameMap[o.global]][name] || 0;
            self.report[self.globalTestNameMap[o.global]][name]++;

            console.log(o.global, colorHashOutput(self.globalTestNameMap[o.global]) || 'no test', colorHashOutput(o.service) || 'not sure', o.segment && colorHashOutput(o.segment), channel || '');

          }

        });

        return self;

    }
}
