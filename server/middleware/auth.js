const models = require('../models');
const Promise = require('bluebird');
const parseCookies = require('./cookieParser.js');

module.exports.createSession = (req, res, next) => {
  var cookie = req.cookies;
  var username = req.body.username;
  req.session = {};

  // if request has NO cookie
  if (!Object.keys(cookie).length) {

    // create a session and assign the userId to the session table
    models.Sessions.create()
      .then(result => {
        return models.Sessions.get({id: result.insertId});
      })
      .then(result => {
        // construct the response cookie and the request session
        res.cookie('shortlyid', result.hash);
        req.session.hash = result.hash;
        next();
      })
      .catch((err) => { console.log(err); });
  }

  // if request has a cookie
  if (Object.keys(cookie).length) {
    var hash = cookie.shortlyid;

    // find the session from db
    models.Sessions.get({ hash })
      .then(result => {

        // if session is valid
        if (result) {
          res.cookie('shortlyid', result.hash);
          req.session.hash = result.hash;
          if (result.userId) {
            req.session.userId = result.userId;
            req.session.user = result.user;
          }
          next();
        }

        // if session is not valid
        if (!result) {
          models.Sessions.create()
            .then(result => {
              return models.Sessions.get({id: result.insertId});
            })
            .then(result => {
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

module.exports.verifySession = (req, res, next) => {
  if (req.method === 'GET' && (req.path === '/' || req.path === '/create' || req.path === '/links')) {
    if (models.Sessions.isLoggedIn(req.session)) {
      next();
    } else {
      res.status(401).redirect('/login');
    }
  } else {
    next();
  }
  return models.Sessions.isLoggedIn(req.session);
};