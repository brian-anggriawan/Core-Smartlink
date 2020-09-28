'use strict';

module.exports = function(sequelize, Sequelize) {
    let Model = sequelize.define(
        'transaction',
        {
            id: {
                type: Sequelize.STRING,
                primaryKey: true,
                allowNull: false,
                unique: true
            },
            pelanggan: {
                type: Sequelize.STRING
            },
            total: {
                type: Sequelize.INTEGER
            },
            disckon_rupiah: {
                type: Sequelize.INTEGER
            },
            diskon_persen: {
                type: Sequelize.INTEGER
            },
            tagihan: {
                type: Sequelize.INTEGER
            },
            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW
            },
            updated_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW
            },
            deleted_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW
            },
            created_by: {
                type: Sequelize.STRING
            },
            updated_by: {
                type: Sequelize.STRING
            },
            deleted_by: {
                type: Sequelize.STRING
            }
        },
        {}
    );

    // Model.associate = function(models) {};

    return Model;
};
