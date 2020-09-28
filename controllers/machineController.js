'use strict';

/* Package */
const async = require('async');
const io = require('socket.io-client');
const socket = io(process.env.APP_IP);

exports.listMachine = (APP, req, callback) => {
    let { machine } = APP.models.mysql;
    let { title, description, status, machine_id } = req.body;

    async.waterfall(
        [
            function validationRequest(callback) {
                let data = {
                    where: {}
                };

                if (title && title != null) data.where.title = { $like: `${title}` };

                if (description && description != null) data.where.description = { $like: `${description}` };

                if (status && status != null) data.where.status = status;

                if (machine_id && machine_id != null) data.where.id = machine_id;

                callback(null, data);
            },

            function requestData(data, callback) {
                machine
                    .findAll({
                        attributes: ['id', 'title', 'description', 'created_at', 'status'],
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

exports.createMachine = (APP, req, callback) => {
    let { id } = req.profile;
    let { machine } = APP.models.mysql;
    let { title, description } = req.body;

    async.waterfall(
        [
            function validationRequest(callback) {
                if (!title || !description)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Invalid Request (All)'
                    });

                let data = {
                    insert: {
                        title: title,
                        description: description,
                        created_by: id
                    }
                };

                callback(null, data);
            },

            function insert(data, callback) {
                machine
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

exports.editMachine = (APP, req, callback) => {
    let { id } = req.profile;
    let { machine } = APP.models.mysql;
    let { title, description, machine_status, machine_id } = req.body;

    async.waterfall(
        [
            function validationRequest(callback) {
                if (!machine_id)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Invalid Request (All)'
                    });

                let data = {
                    update: [
                        {
                            updated_by: id,
                            updated_at: new Date()
                        },
                        {
                            where: {
                                id: machine_id
                            }
                        }
                    ]
                };

                if (machine_status && machine_status != null) {
                    if (machine_status != 0 && machine_status != 1)
                        return callback({
                            code: 'INVALID_REQUEST',
                            message: 'Invalid Request (machine_status)'
                        });

                    data.update[0].status = machine_status;
                }

                if (title && title != null) data.update[0].title = title;

                if (description && description != null) data.update[0].description = description;

                callback(null, data);
            },

            function validationMachineId(data, callback) {
                req.body = {};
                req.body.machine_id = machine_id;

                exports.listMachine(APP, req, (err, result) => {
                    if (err)
                        return callback({
                            code: 'INVALID_REQUEST',
                            message: 'Invalid Request (machine_id)'
                        });

                    callback(null, data);
                });
            },

            function insert(data, callback) {
                machine
                    .update(data.update[0], data.update[1])
                    .then(res => {
                        callback(null, {
                            code: 'OK',
                            message: 'Success',
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

            return callback(null, result);
        }
    );
};

exports.insertCounter = (APP, req, callback) => {
    let { machine_counter } = APP.models.mysql;
    let { machine_id, length, width } = req.body;

    machine_counter
        .create({
            machine_id: machine_id,
            width: width,
            length: length
        })
        .then(res => {
            callback(null, {
                code: 'OK',
                message: 'Success Insert',
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

exports.testingSocket = (APP, req, callback) => {
    socket.emit('counter', {
        machine_id: '1',
        length: '10',
        width: '10'
    });

    callback(null, {
        code: 'OK',
        message: 'Succes hit socket'
    });
};

exports.historyProduction = (APP, req, callback) => {
    let { machine_counter } = APP.models.mysql;
    let { start_date, end_date, machine_id } = req.body;

    async.waterfall(
        [
            function validationRequest(callback) {
                let data = {
                    where: 'where COALESCE(mc.id, 0) <> 0',
                    replacements: {}
                };

                if (start_date && start_date != null && end_date && end_date != null) {
                    data.where += ' and CONVERT(mc.created_at, DATE) BETWEEN :start_date and :end_date';
                    data.replacements.start_date = start_date;
                    data.replacements.end_date = end_date;
                }

                if (machine_id && machine_id != null) {
                    data.where += ' and mc.machine_id = :machine_id';
                    data.replacements.machine_id = machine_id;
                }

                data.query = [
                    `
                        select 
                            mc.machine_id,
                            me.title,
                            me.description,
                            CASE 
                                WHEN HOUR(mc.created_at) = 0 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '00:00 - 01:00'
                                WHEN HOUR(mc.created_at) = 1 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '01:00 - 02:00'
                                WHEN HOUR(mc.created_at) = 2 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '02:00 - 03:00'
                                WHEN HOUR(mc.created_at) = 3 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '03:00 - 04:00'
                                WHEN HOUR(mc.created_at) = 4 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '04:00 - 05:00'
                                WHEN HOUR(mc.created_at) = 5 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '05:00 - 06:00'
                                WHEN HOUR(mc.created_at) = 6 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '06:00 - 07:00'
                                WHEN HOUR(mc.created_at) = 7 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '07:00 - 08:00'
                                WHEN HOUR(mc.created_at) = 8 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '08:00 - 09:00'
                                WHEN HOUR(mc.created_at) = 9 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '09:00 - 10:00'
                                WHEN HOUR(mc.created_at) = 10 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '10:00 - 11:00'
                                WHEN HOUR(mc.created_at) = 11 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '11:00 - 12:00'
                                WHEN HOUR(mc.created_at) = 12 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '12:00 - 13:00'
                                WHEN HOUR(mc.created_at) = 13 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '13:00 - 14:00'
                                WHEN HOUR(mc.created_at) = 14 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '14:00 - 15:00'
                                WHEN HOUR(mc.created_at) = 15 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '15:00 - 16:00'
                                WHEN HOUR(mc.created_at) = 16 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '16:00 - 17:00'
                                WHEN HOUR(mc.created_at) = 17 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '17:00 - 18:00'
                                WHEN HOUR(mc.created_at) = 18 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '18:00 - 19:00'
                                WHEN HOUR(mc.created_at) = 19 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '19:00 - 20:00'
                                WHEN HOUR(mc.created_at) = 20 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '20:00 - 21:00'
                                WHEN HOUR(mc.created_at) = 21 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '21:00 - 22:00'
                                WHEN HOUR(mc.created_at) = 22 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '22:00 - 23:00'
                                WHEN HOUR(mc.created_at) = 23 AND MINUTE(mc.created_at) BETWEEN 0 AND 59 THEN '23:00 - 00:00'
                            END AS hours,
                            COUNT(mc.machine_id) as total
                        from machine_counter mc
                        left outer join machine me on mc.machine_id = me.id
                        ${data.where}
                        group by mc.machine_id,
                                 HOUR(mc.created_at)
                        order by me.title ASC,
                                 HOUR(mc.created_at) ASC
                    `,
                    {
                        model: machine_counter,
                        mapToModel: true,
                        replacements: data.replacements
                    }
                ];

                callback(null, data);
            },

            function requestData(data, callback) {
                APP.db.sequelize
                    .query(data.query[0], data.query[1])
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

exports.dailyReport = (APP, req, callback) => {
    let { machine_counter } = APP.models.mysql;
    let { machine_id } = req.body;

    async.waterfall(
        [
            function validationRequest(callback) {
                let data = {
                    where: 'where COALESCE(mc.id, 0) <> 0',
                    replacements: {}
                };

                if (machine_id && machine_id != null) {
                    data.where += ' and mc.machine_id = :machine_id';
                    data.replacements.machine_id = machine_id;
                }

                data.query = [
                    `
                        select 
                            mc.machine_id,
                            me.title,
                            me.description,
                            COUNT(mc.machine_id) as total
                        from machine_counter mc
                        left outer join machine me on mc.machine_id = me.id
                        ${data.where}
                        group by mc.machine_id
                        order by me.title ASC
                    `,
                    {
                        model: machine_counter,
                        mapToModel: true,
                        replacements: data.replacements
                    }
                ];

                callback(null, data);
            },

            function requestData(data, callback) {
                APP.db.sequelize
                    .query(data.query[0], data.query[1])
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
