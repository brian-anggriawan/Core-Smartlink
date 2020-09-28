'use strict';

/* Package */
const calk = require('chalk');
const moment = require('moment');

/* Controller */
const machineController = require('../controllers/machineController');

const insertLog = palyloadLog => {
    let { event, data, message, success, APP } = palyloadLog;
    let { log_socket } = APP.models.mongo;

    log_socket
        .create({
            event: event,
            data: data,
            message: message,
            success: success,
            date: moment().format('YYYY-MM-DD'),
            time: moment().format('HH:mm:ss'),
            created: new Date()
        })
        .then(res => {
            let template =
                `${calk.bold.blue('======================')} ${calk.bold.yellow('LOG SOCKET')} ${calk.bold.blue('==========================')}\n` +
                `${calk.bold.blue('=============================================================')}\n` +
                `${calk.bold.yellow('EVENT :')} ${success ? calk.bold.green(event) : calk.bold.red(event)}\n` +
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
            console.log(err);
            console.log('Error insert log cronjob');
        });
};

module.exports = (APP, io) => {
    let palyloadLog = {
        APP: APP,
        success: true
    };

    io.on('connection', socket => {
        socket.on('testing', data => {
            palyloadLog.event = 'TESTING';
            palyloadLog.data = {};
            palyloadLog.message = 'Success';

            insertLog(palyloadLog);
        });

        socket.on('counter', data => {
            palyloadLog.event = 'COUNTER';
            palyloadLog.message = 'Success';
            palyloadLog.data = data;

            data.length = data.length ? data.length : 0;
            data.width = data.width ? data.width : 0;
            data.body = data;

            machineController.insertCounter(APP, data, (err, result) => {
                delete data.body;

                if (err) return (palyloadLog.message = 'Error insert'), (palyloadLog.success = false), insertLog(palyloadLog);

                insertLog(palyloadLog);
            });
        });

        console.log('Server socket is connected');
    });
};
