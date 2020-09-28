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
    let { telepon } = req.body;

    user.findAll({
        where: {
            telepon: telepon
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
    let { nama, username, telepon, password } = req.body;

    async.waterfall(
        [
            function validationRequest(callback) {
                if (!username || !nama || !telepon || !password)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Invalid request (All)'
                    });

                if (!APP.validation.name(nama)) return callback({
                    code: 'INVALID_REQUEST',
                    message: 'Invalid request (nama)'
                });

                if (!APP.validation.username(username)) return callback({
                    code: 'INVALID_REQUEST',
                    message: 'Invalid request (username)'
                });

                if (!APP.validation.password(password)) return callback({
                    code: 'INVALID_REQUEST',
                    message: 'Invalid request (password)'
                });

                if (!APP.validation.phone(telepon)) return callback({
                    code: 'INVALID_REQUEST',
                    message: 'Invalid request (telepon)'
                });

                let salt = bcrypt.genSaltSync(10);
                let data = {
                    insert: {
                        nama: nama,
                        username: username,
                        telepon: parseInt(telepon),
                        password: bcrypt.hashSync(password, salt)
                    }
                };

            
                callback(null, data);
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

            function generateId(data, callback) {
                data.request_id ={
                    prefix: 'USR',
                    table: user
                };

                APP.request.generateId(data.request_id, (err, result) => {
                    if (err) return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Gagal request generate id'
                    });

                    data.insert.id = result.data.id;

                    callback(null, data);
                });
            },

            function isnert(data, callback) {
                user.create(data.insert)
                    .then(res => {
                        callback(null, {
                            code: 'OK',
                            message: 'berhasil terdaftar',
                            data: {}
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
                        username: username
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
                            nama: res[0].nama
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
                    if (err)
                        return callback({
                            code: 'ERR',
                            message: 'Error request token',
                            data: err
                        });
                    
                    data.request_token.token = result.data.token;

                    callback(null, {
                        code: 'OK',
                        message: 'Berhasil melakukan login',
                        data: data.request_token
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

