var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var TaskSchema = new mongoose.Schema({
	status		: { type: String, default: "Pending"},
    owner       : String,
    name        : { type: String, required: true },
    input       : String,
    output      : String,
    filename    : String,
    originalname: String,
    path        : String,
    type		: String,
    duration	: Number,
    size		: Number,
    date 		: { type: Date, default: Date.now },
    paid		: { type: Boolean, default: false }
});

module.exports = mongoose.model('Task', TaskSchema);
