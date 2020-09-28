'use strict';

module.exports = function(mongo) {
    if (mongo.models.Example) return mongo.models.Example;

    const ModelSchema = mongo.Schema({
        event: String,
        data: Object,
        message: String,
        success: Boolean,
        date: String,
        time: String,
        created: Date
    });

    return mongo.model('log_socket', ModelSchema);
};
