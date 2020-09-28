'use strict';

module.exports = function(mongo) {
    if (mongo.models.Example) return mongo.models.Example;

    const ModelSchema = mongo.Schema({
        token: String,
        data: Object,
        active: Boolean,
        date: String,
        time: String,
        created: Date
    });

    return mongo.model('access_token', ModelSchema);
};
