'use strict';

module.exports = function(sequelize, Sequelize) {
    let Model = sequelize.define(
        'layanan',
        {
            id: {
                type: Sequelize.STRING,
                primaryKey: true,
                allowNull: false,
                unique: true
            },
            nama: {
                type: Sequelize.STRING
            },
            unit: {
                type: Sequelize.STRING
            },
            harga: {
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
