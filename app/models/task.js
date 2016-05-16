var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var TaskSchema = new mongoose.Schema({

    owner       : String,
    name        : { type: String, required: true},
    input       : String,
    output      : String,
    filename    : String,
    type		: String,
    date 		: { type: Date, default: Date.now },
    paid		: Boolean

});

module.exports = mongoose.model('Task', TaskSchema);
