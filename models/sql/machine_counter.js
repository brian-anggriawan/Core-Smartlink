'use strict';

module.exports = function(sequelize, Sequelize) {
    let Model = sequelize.define(
        'machine_counter',
        {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                allowNull: false,
                autoIncrement: true,
                unique: true
            },
            machine_id: {
                type: Sequelize.INTEGER
            },
            length: {
                type: Sequelize.FLOAT
            },
            width: {
                type: Sequelize.FLOAT
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
        Model.belongsTo(models.machine, {
            foreignKey: 'machine_id',
            targetKey: 'id'
        });
    };

    return Model;
};
