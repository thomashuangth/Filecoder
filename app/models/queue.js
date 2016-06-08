var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var QueueSchema = new mongoose.Schema({
    taskId      : String,
    owner       : String,
    input       : String,
    output      : String,
    filename    : String,
    type        : String,
    path        : String,
    date 		: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Queue', QueueSchema);
