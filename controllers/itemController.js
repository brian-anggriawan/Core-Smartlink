'use strict';

/* Package */
const async = require('async');

exports.create = (APP, req, callback) => {
    let { id } = req.profile;
    let { layanan } = APP.models.mysql;
    let { nama, unit, harga } = req.body;

    async.waterfall(
        [
            function validationRequest(callback) {
                if (!nama || !unit || !harga) return callback({
                    code: 'INVALID_REQUEST',
                    message: 'Invalid request (All)'
                });

                let data = {
                    insert: {
                        nama: nama,
                        unit: unit,
                        harga: parseInt(harga),
                        created_by: id,
                        user_id: id
                    }
                };

                callback(null, data);
            },

            function generateId(data, callback) {
                data.request_id = {
                    table: layanan,
                    prefix: 'LYN'
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

            function insert(data, callback) {
                layanan
                    .create(data.insert)
                    .then(res => {
                        delete data.insert.created_by;

                        callback(null, {
                            code: 'OK',
                            message: 'Success insert layanan',
                            data: data.insert
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
        function (err, result) {
            if (err) return callback(err);

            return callback(null, result);
        }
    )
};