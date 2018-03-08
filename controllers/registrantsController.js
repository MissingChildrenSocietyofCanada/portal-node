'use strict';

var config = require('../config');
var RegistrantsApi = require('../apis/registrants');

exports.list = function (req, res) {
  new RegistrantsApi(config.docDB).getList(req.query.name).then(function (registrants) {
    res.json(registrants);
  });
};

exports.show = function (req, res) {
  new RegistrantsApi(config.docDB).get(req.params.id).then((registrant) => {
    res.render('registrants/show', {
      user: req.user,
      registrant: registrant
    });
  }).catch((err) => { res.render('registrants/show', {
    user: req.user
  })
  });
  ;
}