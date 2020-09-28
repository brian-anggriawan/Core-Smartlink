'use strict';

/* Package */
const jwt = require('jsonwebtoken');
const async = require('async');
const moment = require('moment');

exports.requestToken = (APP, data_user, callback) => {
    let { access_token } = APP.models.mongo;

    async.waterfall(
        [
            function updateToken(callback) {
                let data = {
                    update: [
                        {
                            'data.id': data_user.id
                        },
                        {
                            $set: {
                                active: false
                            }
                        }
                    ],
                    insert: {
                        token: jwt.sign(data_user, process.env.JWT_KEY, { expiresIn: '1d' }),
                        data: data_user,
                        active: true,
                        date: moment().format('YYYY-MM-DD'),
                        time: moment().format('HH:mm:ss'),
                        created_at: new Date()
                    }
                };

                access_token
                    .updateMany(data.update[0], data.update[1])
                    .then(res => {
                        callback(null, data);
                    })
                    .catch(err => {
                        callback({
                            code: 'ERR',
                            message: 'update',
                            data: err
                        });
                    });
            },

            function insertToken(data, callback) {
                access_token
                    .create(data.insert)
                    .then(res => {
                        callback(null, {
                            code: 'OK',
                            message: 'Success',
                            data: res
                        });
                    })
                    .catch(err => {
                        callback({
                            code: 'ERR',
                            message: 'insert',
                            data: err
                        });
                    });
            }
        ],
        function(err, result) {
            if (err) return callback(err);

            return callback(null, result);
        }
    );
};

exports.destroy = (APP, token, callback) => {
    let { access_token } = APP.models.mongo;
    let update = [
        {
            token: token
        },
        {
            $set: {
                active: false
            }
        }
    ];

    access_token
        .updateMany(update[0], update[1])
        .then(res => {
            callback(null, {
                code: 'OK',
                message: 'Sucess logout'
            });
        })
        .catch(err => {
            callback({
                code: 'ERR',
                message: 'Error logout',
                data: err
            });
        });
};

exports.validation = (APP, req, callback) => {
    let { access_token } = APP.models.mongo;
    const token = req.headers['authorization'];

    async.waterfall(
        [
            function validationToken(callback) {
                if (typeof token == 'undefined')
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Invalid'
                    });

                callback(null, {});
            },

            function validationDatabase(data, callback) {
                access_token
                    .find({
                        token: token,
                        active: true,
                        date: moment().format('YYYY-MM-DD')
                    })
                    .then(res => {
                        if (res.length == 0)
                            return callback({
                                code: 'NOT_FOUND',
                                message: 'Not found'
                            });

                        callback(null, data);
                    })
                    .catch(err => {
                        callback({
                            code: 'ERR',
                            message: 'select',
                            data: err
                        });
                    });
            },

            function validationJwt(data, callback) {
                try {
                    let data_token = jwt.verify(token, process.env.JWT_KEY);

                    callback(null, {
                        code: 'OK',
                        message: 'success',
                        data: data_token
                    });
                } catch (err) {
                    callback({
                        code: 'ERR',
                        message: 'validation',
                        data: {}
                    });
                }
            }
        ],
        function(err, result) {
            if (err) return callback(err);

            return callback(null, result);
        }
    );
};

exports.decodeToken = token => {
    if (typeof token == 'undefined') return {};

    try {
        return jwt.verify(token, process.env.JWT_KEY);
    } catch (err) {
        return {};
    }
};
