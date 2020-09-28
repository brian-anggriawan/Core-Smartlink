'use strict';

module.exports = function(sequelize, Sequelize) {
    let Model = sequelize.define(
        'machine',
        {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                allowNull: false,
                autoIncrement: true,
                unique: true
            },
            title: {
                type: Sequelize.STRING
            },
            description: {
                type: Sequelize.TEXT
            },
            status: {
                type: Sequelize.INTEGER,
                defaultValue: 1
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
                type: Sequelize.INTEGER
            },
            updated_by: {
                type: Sequelize.INTEGER
            },
            deleted_by: {
                type: Sequelize.INTEGER
            }
        },
        {}
    );

    Model.associate = function(models) {
        Model.hasMany(models.machine_counter, {
            foreignKey: 'machine_id',
            sourceKey: 'id'
        });
    };

    return Model;
};
