'use strict';

/* Package */
const calk = require('chalk');
const scheduler = require('node-schedule');
const moment = require('moment');

const insertLog = palyloadLog => {
    let { activity, data, message, success, APP } = palyloadLog;
    let { log_cronjob } = APP.models.mongo;

    log_cronjob
        .create({
            activity: activity,
            data: data,
            message: message,
            success: success,
            date: moment().format('YYYY-MM-DD'),
            time: moment().format('HH:mm:ss'),
            created: new Date()
        })
        .then(res => {
            let template =
                `${calk.bold.blue('======================')} ${calk.bold.yellow('LOG CRONJOB')} ${calk.bold.blue('==========================')}\n` +
                `${calk.bold.blue('=============================================================')}\n` +
                `${calk.bold.yellow('ACTIVITY :')} ${success ? calk.bold.green(activity) : calk.bold.red(activity)}\n` +
                `${calk.bold.yellow('SUCCESS  :')} ${success ? calk.bold.green(success) : calk.bold.red(success)}\n` +
                `${calk.bold.yellow('DATA     :')} ${success ? calk.bold.green(JSON.stringify(data)) : calk.bold.red(JSON.stringify(data))}\n` +
                `${calk.bold.yellow('MESSAGE  :')} ${success ? calk.bold.green(message) : calk.bold.red(message)}\n` +
                `${calk.bold.yellow('DATE     :')} ${success ? calk.bold.green(moment().format('YYYY-MM-DD')) : calk.bold.red(moment().format('YYYY-MM-DD'))}\n` +
                `${calk.bold.yellow('TIME     :')} ${success ? calk.bold.green(moment().format('HH:mm:ss')) : calk.bold.red(moment().format('HH:mm:ss'))}\n` +
                `${calk.bold.yellow('CREATED  :')} ${success ? calk.bold.green(new Date()) : calk.bold.red(new Date())}\n` +
                `${calk.bold.blue('=============================================================')}\n` +
                `${calk.bold.blue('=============================================================')}\n`;

            return console.log(template);
        })
        .catch(err => {
            console.log('Error insert log cronjob');
        });
};

module.exports = APP => {
    let palyloadLog = {
        APP: APP,
        success: true
    };

    // Testing cronjob
    scheduler.scheduleJob('1 * * 5 5 5', time => {
        (palyloadLog.activity = 'TESTING'), (palyloadLog.data = {}), (palyloadLog.message = 'Success'), insertLog(palyloadLog);
    });
};
