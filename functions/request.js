'use strict';

exports.generateId = (data, callback) => {
    let { table, prefix } = data;

    table
        .findAndCountAll({
            attributes: ['id']
        })
        .then(res => {
            let count = res.count == 0 ? 1 : res.count + 1;
            let id = `${prefix}00${count}`;

            callback(null, {
                code: 'OK',
                message: 'Success generate id',
                data: {
                    id: id
                }
            });
        })
        .catch(err => {
            callback({
                code: 'ERR',
                message: 'Gagal genereate id',
                data: err
            });
        });

};