'use strict';

module.exports = function(sequelize, Sequelize) {
    let Model = sequelize.define(
        'user',
        {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                allowNull: false,
                autoIncrement: true,
                unique: true
            },
            nama: {
                type: Sequelize.STRING
            },
            username: {
                type: Sequelize.STRING
            },
            password: {
                type: Sequelize.STRING
            },
            telepon: {
                type: Sequelize.STRING
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
