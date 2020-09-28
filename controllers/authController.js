'use strict';

/* Package internal */
const async = require('async');
const bcrypt = require('bcrypt');

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

exports.logout = (APP, req, callback) => {
    const token = req.headers['authorization'];

    APP.authentication.destroy(APP, token, (err, result) => {
        if (err) return callback(err);

        callback(null, result);
    });
};

exports.profile = (APP, req, callback) => {
    let { id } = req.profile;
    let { user } = APP.models.mysql;

    user.findAll({
        attributes: ['id', 'username', 'notelp', 'email'],
        where: {
            id: id,
            status: 1
        }
    })
        .then(res => {
            if (res.length == 0)
                return callback({
                    code: 'NOT_FOUND'
                });

            callback(null, {
                code: 'OK',
                message: 'Found',
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
};

exports.editprofile = (APP, req, callback) => {
    let { id } = req.profile;
    let { user } = APP.models.mysql;
    let { notelp, email, password } = req.body;

    async.waterfall(
        [
            function validationRequest(callback) {
                let data = {
                    update: [
                        {
                            updated_by: id,
                            updated_at: new Date()
                        },
                        {
                            where: {
                                id: id
                            }
                        }
                    ]
                };

                if (notelp && notelp != null) data.update[0].notelp = notelp;

                if (email && email != null) data.update[0].email = email;

                if (password && password != null) {
                    let salt = bcrypt.genSaltSync(10);

                    data.update[0].password = bcrypt.hashSync(password, salt);
                }

                callback(null, data);
            },

            function update(data, callback) {
                user.update(data.update[0], data.update[1])
                    .then(res => {
                        callback(null, {
                            code: 'OK',
                            message: 'Success update',
                            data: data.update[0]
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

            return callback(result);
        }
    );
};

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

exports.validationEmail = (APP, req, callback) => {
    let { user } = APP.models.mysql;
    let { email } = req.body;

    user.findAll({
        where: {
            email: email
        }
    })
        .then(res => {
            if (res.length > 0)
                return callback({
                    code: 'INVALID_REQUEST',
                    message: 'Email invalid'
                });

            callback(null, {
                code: 'OK',
                message: 'Email valid'
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

exports.addUser = (APP, req, callback) => {
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

exports.listUser = (APP, req, callback) => {
    let { user } = APP.models.mysql;
    let { status, username, email, notelp } = req.body;

    async.waterfall(
        [
            function validationRequest(callback) {
                let data = {
                    where: {}
                };

                if (status && status != null && (status == 0 || status == 1)) data.where.status = status;

                if (username && username != null) data.where.username = { $like: `%${username}%` };

                if (email && email != null) data.where.email = { $like: `%${email}%` };

                if (notelp && notelp != null) data.where.notelp = { $like: `%${notelp}%` };

                callback(null, data);
            },

            function requestData(data, callback) {
                user.findAll({
                    attributes: ['id', 'username', 'email', 'notelp', 'created_at'],
                    where: data.where,
                    order: [['created_at', 'DESC']]
                })
                    .then(res => {
                        if (res.length == 0)
                            return callback({
                                code: 'NOT_FOUND',
                                message: 'Data tidak ditemukan',
                                data: res
                            });

                        callback(null, {
                            code: 'OK',
                            message: 'Data ditemukan',
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
