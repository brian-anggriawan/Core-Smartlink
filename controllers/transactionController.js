'use strict';

/* Package */
const async = require('async');

exports.buyItem = (APP, req, callback) => {
    let { id } = req.profile;
    let { transaction, detail_transaction, layanan } = APP.models.mysql;
    let { pelanggan, diskon_persen, item } = req.body;

    async.waterfall(
        [
            function validationRequest(callback) {
                if (!pelanggan || !diskon_persen || !item) return callback({
                    code: 'INVALID_REQUEST',
                    message: 'Invalid request(All)'
                });

                if (!Array.isArray(item) ) return callback({
                    code: 'INVALID_REQUEST',
                    message: 'Item harus array'
                });

                if (item.length == 0) return callback({
                    code: 'INVALID_REQUEST',
                    message: 'Item yang di pilih minimal 1'
                }); 

                try {
                    item.map(x => {
                        if (!x.layanan_id || !x.qty) throw new Error('key array');

                        x.qty = parseInt(x.qty);
                    });
                } catch (err) {
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Key pada item array'
                    });
                }

                let data = {
                    insert: {
                        pelanggan: pelanggan,
                        total: 0,
                        diskon_persen: parseInt(diskon_persen || 0),
                        diskon_rupiah: 0,
                        tagihan: 0,
                        user_id: id,
                        created_by: id,
                        detail: []
                    }
                };  

                callback(null, data);
            },

            function requestId(data, callback) {
                data.request_id = {
                    table: transaction,
                    prefix: 'TRX'
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


            function validationLayananId(data, callback) {
                data.validation_id = [];

                Promise.all(
                    item.map(x => {
                        return layanan
                            .findAll({
                                attributes: ['harga','nama','unit'],
                                where: {
                                    id: x.layanan_id
                                }
                            })
                            .then(res => {
                                if (res.length > 0) {
                                    let harga = res[0].harga || 0;
                                    let total = harga * x.qty;

                                    data.insert.total += total
                                    data.insert.detail.push({
                                        layanan_id: x.layanan_id,
                                        qty: x.qty,
                                        layanan: {
                                            id: x.layanan_id,
                                            nama: res[0].nama,
                                            unit: res[0].unit,
                                            harga: res[0].harga
                                        }
                                    });
                                    x.transaction_id = data.insert.id;
                                } else {
                                    data.validation_id.push(x);
                                }

                                return true;
                                
                            })
                    })
                )
                .then(res => {
                    if (data.validation_id.length > 0) return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Invalid layanan_id',
                        data: data.validation_id
                    });

                    data.insert.diskon_rupiah = data.insert.diskon_persen == 0 ? 0 : (data.insert.total * data.insert.diskon_persen / 100);
                    data.insert.tagihan = data.insert.diskon_persen == 0 ? data.insert.total : (data.insert.total - data.insert.diskon_rupiah);

                    callback(null, data);
                })
                .catch(err => {
                    callback({
                        code: 'ERR',
                        message: 'Promise validation id',
                        data: err
                    });
                });
            },

            function insertTransaction(data, callback) {
                transaction
                    .create(data.insert)
                    .then(res => {
                        delete data.insert.created_by;
                        delete data.insert.id;
                        callback(null, data);
                    })
                    .catch(err => {
                        callback({
                            code: 'ERR',
                            message: 'Database bermasalah (insert transaction)',
                            data: err
                        });
                    });
            },

            function insertDetail(data, callback) {
                detail_transaction
                    .bulkCreate(item)
                    .then(res => {
                        callback(null, {
                            code: 'OK',
                            message: 'Success transaction',
                            data: data.insert
                        })
                    })
                    .catch(err => {
                        callback({
                            code: 'ERR',
                            message: 'Database bermasalah (insert detail)',
                            data: err
                        })
                    });
            }
        ],
        function (err, result) {
            if (err) return callback(err);

            return callback(null, result);
        }
    )
};