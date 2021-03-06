'use strict';

const events = require('events');

events.EventEmitter.prototype._maxListeners = 100;
events.EventEmitter.defaultMaxListeners = 100;

const fs = require('fs');
const async = require('async');
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const trycatch = require('trycatch');
const path = require('path');
const moment = require('moment');
const ip = require('ip');
const environment = require('./config/app.json').env;
const io = require('socket.io');

// Your active environment.
require('env2')('.env.' + environment);

// Your Database configurations.
const db = require('./config/db.js');

// Your route setup.
const routes = require('./config/routes.json');

// Your cronjob setup
const cronJob = require('./config/cronJob');

// Your socket setup
const socket = require('./config/socket');

// Your authentication setup
const authentication = require('./functions/authentication');

// Your messages.json.
let messages = {};
trycatch(
    () => {
        messages = require('./config/messages.json');
    },
    err => {
        if (err) console.log('[WARN] Not using any error message mapping');
    }
);

// Initialize `APP` object.
const app = express();
const http = require('http').createServer(app);
let APP = {};
APP.db = db;

app.get('/favicon.ico', function(req, res) {
    res.status(204);
    res.end();
});

/**
 * ExpressJS basic middlewares.
 */
if (process.env.JSON_REQUEST === 'true') {
    app.use((req, res, next) => {
        bodyParser.json({ limit: process.env.JSON_REQUEST_LIMIT })(req, res, err => {
            if (err) {
                let params = {
                    code: 'INVALID_REQUEST',
                    message: 'Error parsing JSON request',
                    info: err
                };
                return resOutput(APP, req, res, params, 'err');
            }
            next();
        });
    });
}
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan(process.env.LOG_ENV));

/**
 * @Application functions.
 */

// Models.
function modelObj(db, callback) {
    async.parallel(
        [
            function getSequelizeModel(callback) {
                if (process.env.MYSQL !== 'true') return callback(null, {});

                fs.readdir(__dirname + '/models/sql', (err, files) => {
                    let x = [];

                    files.map(model => {
                        if (model.match('.js')) x.push(model);
                    });

                    let len = x.length;

                    if (len < 1) return callback(null, {});

                    let n = 1;
                    let models = {};

                    x.map(model => {
                        let Model = db.sequelize.import('./models/sql/' + model);
                        let modelName = model.replace('.js', '');

                        models[modelName] = Model;

                        if (n === len) {
                            let mysqls = {};

                            Object.keys(models).forEach(val => {
                                if (models[val].associate) models[val].associate(models);

                                mysqls[val] = models[val];
                            });

                            callback(null, mysqls);
                        }

                        n++;
                    });
                });
            },
            function getMongooseModel(callback) {
                if (process.env.MONGO !== 'true') return callback(null, {});

                fs.readdir(__dirname + '/models/mongo', (err, files) => {
                    let x = [];

                    files.map(model => {
                        if (model.match('.js')) x.push(model);
                    });

                    let len = x.length;

                    if (len < 1) return callback(null, {});

                    let n = 1;
                    let models = {};

                    x.map(model => {
                        let Model = require('./models/mongo/' + model);
                        let modelName = model.replace('.js', '');

                        models[modelName] = Model(db.mongo);

                        if (n === len) return callback(null, models);

                        n++;
                    });
                });
            }
        ],
        (err, result) => {
            if (err) return callback(err);

            let models = {};
            models.mysql = result[0];
            models.mongo = result[1];

            return callback(null, models);
        }
    );
}

// Req & Res logging
function resLog(APP, req, callback) {
    if (process.env.MONGO !== 'true') return callback(null, true);

    let logModel = {};

    if (db.mongo.models._logs) {
        logModel = db.mongo.models._logs;
    } else {
        logModel = db.mongo.model(
            '_logs',
            db.mongo.Schema({
                endpoint: String,
                request: String,
                response: String,
                status: String,
                date: Date,
                time: String,
                elapsed_time: String
            })
        );
    }

    logModel.create(req.body, err => {
        if (err) return callback(err);

        return callback(null, true);
    });
}

// Response output.
function resOutput(APP, req, res, params, status) {
    let output = {};

    async.waterfall(
        [
            function generateMessage(callback) {
                let message = {
                    company: {}
                };

                if (messages[params.code]) message.company = messages[params.code];

                output.code = message.company.code || params.code;
                output.message = params.message || message.company.message;
                output.status = params.status || message.company.status;
                output.data = params.data || message.company.data;
                output.debug = undefined;

                if (process.env.NODE_ENV !== 'production') {
                    if (message.company.error !== false) {
                        output.debug = {
                            from: params.from || process.env.SERVICE_NAME || message.company.from,
                            status: params.status || message.company.status,
                            name: params.name || message.company.name,
                            info: params.info || message.company.info
                        };
                    }
                }

                if (process.env.APP_MESSAGE !== 'true') output = params;
             
                callback(null, message);
            },
            function logging(message, callback) {
                req.elapsedTime = new Date().getTime() - req.startTime;

                resLog(
                    APP,
                    {
                        body: {
                            request: req.body ? JSON.stringify(req.body) : null,
                            response: output ? JSON.stringify(output) : null,
                            status: message.company.status || 200,
                            endpoint: req.originalUrl,
                            date: req.customDate,
                            time: req.customTime,
                            elapsed_time: req.elapsedTime || '0'
                        }
                    },
                    err => {
                        if (err) console.log(err);
                        callback(null, message);
                    }
                );
            },
            function printing(message, callback) {
                if (process.env.APP_LOG !== 'true') return callback(null, message);

                //Limit request/response logging print character
                let request = req.body ? (JSON.stringify(req.body).length > 3000 ? JSON.stringify(req.body).substr(0, 3000) + ' ...(Selengkapnya di Log Mongo)' : JSON.stringify(req.body)) : '';
                let response = output ? (JSON.stringify(output).length > 3000 ? JSON.stringify(output).substr(0, 3000) + ' ...(Selengkapnya di Log Mongo)' : JSON.stringify(output)) : '';

                if (status === 'err') {
                    console.error('\n==========================================================');
                    console.error('STATUS       : ERROR');
                    console.error('IP           : ' + ip.address());
                    console.error('ENDPOINT     : ' + req.originalUrl);
                    console.error('TIMESTAMP    : ' + req.customDate);
                    console.error('PROCESS TIME : ' + (req.elapsedTime || '0') + ' ms');
                    console.error('====================== REQUEST ===========================');
                    console.error(request + '\n');
                    console.error('====================== RESPONSE ==========================');
                    console.error(response + '\n');
                    console.error('==========================================================');
                } else {
                    console.log('\n==========================================================');
                    console.log('STATUS       : OK');
                    console.log('IP           : ' + ip.address());
                    console.log('ENDPOINT     : ' + req.originalUrl);
                    console.log('TIMESTAMP    : ' + req.customDate);
                    console.log('PROCESS TIME : ' + (req.elapsedTime || '0') + ' ms');
                    console.log('====================== REQUEST ===========================');
                    console.log(request + '\n');
                    console.log('====================== RESPONSE ==========================');
                    console.log(response + '\n');
                    console.log('==========================================================');
                }

                callback(null, message);
            }
        ],
        (err, message) => {
            trycatch(
                () => {
                    if (process.env.JSON_RESPONSE !== 'true') return res.status(message.company.code || 200).send(output);
                    return res.status(message.company.code || 200).json(output);
                },
                () => {
                    if (process.env.JSON_RESPONSE !== 'true') return res.status(message.company.code || 200).send(output);
                    return res.status(message.company.code || 200).json(output);
                }
            );
        }
    );
}

/**
 * @Application registrar.
 */
async.series(
    [
        /**
         * This will register all of your functions from `/functions` directory into `APP` object,
         * so you can use them through the object directly without calling `require` anymore.
         *
         * Just make sure you pass the `APP` object on
         * every single function you made. Basicly, you'll need to do that on and from the controller.
         * The Controller of course, must has every arguments you need, and it did (see the `exampleController`).
         */
        function initializeAPPFunctions(callback) {
            fs.readdir('./functions', (err, files) => {
                let len = files.length;
                let lenX = len - 1;
                let n = 0;

                files.map(func => {
                    if (func.match('.js')) {
                        APP[func.replace('.js', '')] = require('./functions/' + func);

                        if (n === lenX) return callback(null, true);
                    }

                    n++;
                });
            });
        },

        /**
         * This will register all of your models from `/models` directory into `APP` object,
         * so you can use them through the object directly without calling `require` anymore.
         *
         * Just make sure you pass the `APP` object on
         * every single function you made. Basicly, you'll need to do that on and from the controller.
         * The Controller of course, must has every arguments you need, and it did (see the `exampleController`).
         */
        function initializeAPPModels(callback) {
            modelObj(db, (err, result) => {
                if (err) return callback(err);

                APP.models = result;

                callback(null, true);
            });
        }
    ],
    () => {
        app.use((req, res, next) => {
            req.customDate = new Date();
            req.customTime = moment()
                .format('HH:mm:ss')
                .toUpperCase();
            req.customTimestamp = moment()
                .format('YYYY-MM-DD HH:mm:ss')
                .toUpperCase();
            req.startTime = new Date().getTime();

            next();
        });

        // Assuming endpoint `/` as an unwanted service.
        app.all('/', (req, res) => {
            return resOutput(
                APP,
                req,
                res,
                {
                    code: '00',
                    message: 'Hello World!'
                },
                'ok'
            );
        });

        /**
         * This will register all of your routes from `routes.json` file,
         * so you don't need to re-define their object instance anymore.
         */
        const keys = Object.keys(routes);
        const len = keys.length - 1;
        let n = 0;

        keys.map(endpoint => {
            /* validation authentication API */
            app.use(endpoint, (req, res, next) => {
                if (!routes[endpoint].authentication) return next();

                authentication.validation(APP, req, (err, result) => {
                    if (err) return resOutput(APP, req, res, { code: 'TOKEN_ERR' }, 'err');

                    req.profile = result.data;

                    next();
                });
            });

            /* validation request API */
            app.use(endpoint, (req, res, next) => {
                if (!routes[endpoint].requestBody) return next();

                if (Object.keys(req.body).length == 0) return resOutput(APP, req, res, { code: 'INVALID_REQUEST', message: 'Request Body tidak boleh kosong' }, 'err');

                next();
            });

            /* include routing API */
            app[routes[endpoint].method](endpoint, (req, res) => {
                trycatch(
                    () => {
                        require('./controllers/' + routes[endpoint].controller + '.js')[routes[endpoint].function](APP, req, (err, result) => {
                            if (err) return resOutput(APP, req, res, err, 'err');

                            return resOutput(APP, req, res, result, 'ok');
                        });
                    },
                    err => {
                        console.log(err); //Debugging Purpose
                        return resOutput(
                            APP,
                            req,
                            res,
                            {
                                code: '-1',
                                message: 'General error!'
                            },
                            'err'
                        );
                    }
                );
            });

            if (n === len) {
                app.use((req, res) => {
                    return resOutput(
                        APP,
                        req,
                        res,
                        {
                            code: '-1',
                            message: 'Service not found!'
                        },
                        'err'
                    );
                });

                http.listen(process.env.PORT, () => {
                    console.log('[OK] ' + process.env.SERVICE_NAME + ' start on port ' + process.env.PORT + '!');
                    console.log('[OK] ' + (len + 1) + ' route(s) registered!');

                    /* Include cronjob */
                    if (process.env.CRON_JOB == 'true') {
                        cronJob(APP);
                        console.log('[OK] start on cron job');
                    }

                    /* Include socket */
                    if (process.env.SOCKET == 'true') {
                        socket(APP, io.listen(http));
                        console.log('[OK] start on socket');
                    }

                    return;
                });
            }

            n++;
        });
    }
);
