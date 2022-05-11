const parseCookies = (req, res, next) => {
  var cookies = req.headers.cookie;
  if (cookies) {
    var cookiesArr = cookies.split('; ');
    cookiesArr.forEach((cookie) => {
      var keyValue = cookie.split('=');
      var key = keyValue[0];
      var value = keyValue[1];
      req.cookies[key] = value;
    });
  } else {
    req.cookies = {};
  }
  next();
};

module.exports = parseCookies;