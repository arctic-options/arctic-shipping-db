var express = require('express');
var router = express.Router();
var theapp = require('app');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/time/:year/:month/:day/:hour', function(req, res, next) {
	console.log(theapp)
	theapp.arctic.findAll({ where: {mmsi: '273365280'} }).then(function(results) {
		jsonvals = results.toJSON();
  		console.log("project: ", jsonvals)

	})
});

module.exports = router;
