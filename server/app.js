const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const Auth = require('./middleware/auth');
const parseCookies = require('./middleware/cookieParser');
const models = require('./models');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(parseCookies, Auth.createSession, Auth.verifySession);
app.use(express.static(path.join(__dirname, '../public')));



app.get('/',
  (req, res) => {
    res.render('index');
  });

app.get('/create',
  (req, res) => {
    res.render('index');
  });

app.get('/links',
  (req, res, next) => {
    models.Links.getAll()
      .then(links => {
        res.status(200).send(links);
      })
      .error(error => {
        res.status(500).send(error);
      });
  });

app.post('/links',
  (req, res, next) => {
    var url = req.body.url;
    if (!models.Links.isValidUrl(url)) {
      // send back a 404 if link is not valid
      return res.sendStatus(404);
    }

    return models.Links.get({ url })
      .then(link => {
        if (link) {
          throw link;
        }
        return models.Links.getUrlTitle(url);
      })
      .then(title => {
        return models.Links.create({
          url: url,
          title: title,
          baseUrl: req.headers.origin
        });
      })
      .then(results => {
        return models.Links.get({ id: results.insertId });
      })
      .then(link => {
        throw link;
      })
      .error(error => {
        res.status(500).send(error);
      })
      .catch(link => {
        res.status(200).send(link);
      });
  });

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/signup', (req, res, next) => {
  res.status(200).render('signup');
});

app.get('/login', (req, res, next) => {
  res.status(200).render('login');
});

app.post('/signup', (req, res, next) => {
  var username = req.body.username;
  var password = req.body.password;

  // if password is empty
  if (!password) {
    res.status(401).redirect('/signup');
  } else {
    // checking if username already registered
    return models.Users.get({ username })
      .then(result => {
        if (result) {
          res.status(304).redirect('/signup');
        } else {
          // if username is not taken, create the user and pw
          models.Users.create({ username, password })
            .then(result => {
              // links the hash with user in the session table to indicate 'login' status
              return models.Sessions.update({ hash: req.session.hash }, { userId: result.insertId });
            })
            .then(result => {
              res.status(201).redirect('/');
            })
            .error(error => {
              res.status(500).send(error);
            });
        }
      });
  }
});

app.post('/login', (req, res, next) => {
  var username = req.body.username;
  var attempt = req.body.password;
  var id;
  return models.Users.get({ username: username })
    .then(function (result) {
      if (!result) {
        return res.status(304).redirect('/login');
      }
      var password = result.password;
      var salt = result.salt;
      id = result.id;
      return models.Users.compare(attempt, password, salt);
    })
    .then(function (matched) {
      if (matched) {
        models.Sessions.update({hash: req.session.hash}, {userId: id})
          .then(result => {
            res.status(302).redirect('/');
          })
          .catch( err => console.log(err) );
      } else {
        res.status(401).redirect('/login');
      }
    })
    .error(error => {
      res.status(500).send(error);
    });

});

app.get('/logout', (req, res, next) => {
  models.Sessions.delete({ hash: req.cookies.shortlyid });
  // //res.sendStatus(200);
  res.status(200).redirect('/login');
});

/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
