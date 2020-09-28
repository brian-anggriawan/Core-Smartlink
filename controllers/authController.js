'use strict';

/* Package internal */
const async = require('async');
const bcrypt = require('bcrypt');

exports.validationUserName = (APP, req, callback) => {
    let { user } = APP.models.mysql;
    let { username } = req.body;

    user.findAll({
        where: {
            username: username
        }
    })
        .then(res => {
            if (res.length > 0)
                return callback({
                    code: 'INVALID_REQUEST',
                    message: 'Username invalid'
                });

            callback(null, {
                code: 'OK',
                message: 'Username valid'
            });
        })
        .catch(err => {
            callback({
                code: 'ERR',
                message: 'Database bermasalah',
                data: err
            });
        });
};

exports.validationNotelp = (APP, req, callback) => {
    let { user } = APP.models.mysql;
    let { notelp } = req.body;

    user.findAll({
        where: {
            notelp: notelp
        }
    })
        .then(res => {
            if (res.length > 0)
                return callback({
                    code: 'INVALID_REQUEST',
                    message: 'Notelp invalid'
                });

            callback(null, {
                code: 'OK',
                message: 'Notelp valid'
            });
        })
        .catch(err => {
            callback({
                code: 'ERR',
                message: 'Database bermasalah',
                data: err
            });
        });
};

exports.register = (APP, req, callback) => {
    let { user } = APP.models.mysql;
    let { username, email, notelp, password } = req.body;

    async.waterfall(
        [
            function validationRequest(callback) {
                if (!username || !email || !notelp || !password)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Invalid request (All)'
                    });
                let salt = bcrypt.genSaltSync(10);
                let data = {
                    insert: {
                        username: username,
                        email: email,
                        notelp: notelp,
                        password: bcrypt.hashSync(password, salt)
                    }
                };

                callback(null, data);
            },

            function validationEmail(data, callback) {
                exports.validationEmail(APP, req, (err, result) => {
                    if (err) return callback(err);

                    callback(null, data);
                });
            },

            function validationUserName(data, callback) {
                exports.validationUserName(APP, req, (err, result) => {
                    if (err) return callback(err);

                    callback(null, data);
                });
            },

            function validationNoTelp(data, callback) {
                exports.validationNotelp(APP, req, (err, result) => {
                    if (err) return callback(err);

                    callback(null, data);
                });
            },

            function isnert(data, callback) {
                user.create(data.insert)
                    .then(res => {
                        callback(null, {
                            code: 'OK',
                            message: 'Success create user',
                            data: res
                        });
                    })
                    .catch(err => {
                        callback({
                            code: 'ERR',
                            message: 'Database bermasalah',
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

exports.authentication = (APP, req, callback) => {
    let { user } = APP.models.mysql;
    let { username, password } = req.body;

    async.waterfall(
        [
            function validationRequest(callback) {
                if (!username || !password)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan parameter (All)'
                    });

                callback(null, {});
            },

            function validationUser(data, callback) {
                user.findAll({
                    where: {
                        username: username,
                        status: 1
                    }
                })
                    .then(res => {
                        if (res.length == 0)
                            return callback({
                                code: 'INVALID_REQUEST',
                                message: 'Username or password invalid'
                            });

                        data.validation_password = bcrypt.compareSync(password, res[0].password);

                        if (!data.validation_password)
                            return callback({
                                code: 'INVALID_REQUEST',
                                message: 'Username or password invalid'
                            });

                        data.request_token = {
                            id: res[0].id,
                            username: res[0].username,
                            image: res[0].image,
                            email: res[0].email,
                            notelp: res[0].notelp
                        };

                        callback(null, data);
                    })
                    .catch(err => {
                        callback({
                            code: 'ERR',
                            message: 'Database bermasalah',
                            data: err
                        });
                    });
            },

            function requestToken(data, callback) {
                APP.authentication.requestToken(APP, data.request_token, (err, result) => {
                    console.log(err);
                    if (err)
                        return callback({
                            code: 'ERR',
                            message: 'Error request token',
                            data: err
                        });

                    callback(null, {
                        code: 'OK',
                        message: 'Success',
                        data: result.data
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

