const models = require('../models');
const Promise = require('bluebird');
const parseCookies = require('./cookieParser.js');

module.exports.createSession = (req, res, next) => {
  console.log('each test:');
  var cookie = req.cookies;
  req.session = {};
  console.log(cookie);

  if (!Object.keys(cookie).length) {
    models.Sessions.create()
      .then(function (hash) {
        return models.Sessions.get({id: hash.insertId});
      })
      .then(function (result) {
        res.cookie('shortlyid', result.hash);
        req.session.hash = result.hash;
        next();
      });
  }

  if (Object.keys(cookie).length) {
    return models.Sessions.get({hash: cookie.shortlyid})
      .then((result) => {
        if (result) {
          res.cookie('shortlyid', result.hash);
          req.session.hash = result.hash;
          if (result.userId) {
            req.session.userId = result.userId;
            req.session.user = result.user;
          }
          next();
        }

        if (!result) {
          models.Sessions.create()
            .then((result) => {
              return models.Sessions.get({id: result.insertId});
            })
            .then((result) => {
              res.clearCookie('shortlyid');
              res.cookie('shortlyid', result.hash);
              req.session.hash = result.hash;
              next();
            });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

