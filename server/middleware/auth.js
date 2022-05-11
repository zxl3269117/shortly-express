const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {
  var cookie = req.cookies;
  console.log(cookie);
  if (!Object.keys(cookie).length) {
    models.Sessions.create()
      .then(function (hash) {
        return models.Sessions.get({id: hash.insertId});
      })
      .then(function (result) {
        console.log(result);
        res.cookie('shortlyid', result.hash);
        req.session = {};
        console.log(req.session);
        req.session.hash = result.hash;
        next();
      })
  } else if (cookie) {

  }

};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

