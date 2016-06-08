var config = require('./config');

module.exports = {

    'facebookAuth' : {
        'clientID'      : '222755674782837', // your App ID
        'clientSecret'  : 'a0ecf339fdf6d953822d29e1481bd1b1', // your App Secret
        'callbackURL'   : 'http://' + config.domain + ':' + config.serverPort + '/auth/facebook/callback'
    },

    'googleAuth' : {
        'clientID'      : '690240234926-hnuutcgr9k2954p0fvkt1qoeq897r8g9.apps.googleusercontent.com',
        'clientSecret'  : 'Rv0c8b3wJKKGEG98VDzrYk4u',
        'callbackURL'   : 'http://' + config.domain + ':' + config.serverPort + '/auth/google/callback'
    }

};