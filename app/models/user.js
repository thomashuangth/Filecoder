var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var UserSchema = new mongoose.Schema({
	local            : {
        email        : String,
        password     : String,
        username     : String
    },
    facebook         : {
        id           : String,
        token        : String,
        email        : String,
        username     : String
    },
    google           : {
        id           : String,
        token        : String,
        email        : String,
        username     : String
    }

});

// Generate a hash for password
UserSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// Check Password
UserSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.local.password);
};

module.exports = mongoose.model('User', UserSchema);
