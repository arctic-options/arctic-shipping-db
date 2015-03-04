var express = require('express');
var router = express.Router();
var path = require('path');
var Sequelize = require('sequelize');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//sequelize setup
var sequelize = new Sequelize('arctic', 'dan_yocum', 'fizzBot1', {
  host: 'localhost',
  dialect: 'postgres',

  pool: {
    max: 5,
    min: 0,
    idle: 10000
  },

});

//connect to shipping table
var arctic = sequelize.define('shipping', {
  id:{
    type: Sequelize.STRING,
    field: 'gid'
  },
  mmsi: {
    type: Sequelize.STRING,
    field: 'mmsi' 
  },
  time: {
    type: Sequelize.DATE,
    field: 'time'
  },
  type: {
    type: Sequelize.STRING,
    field: 'type'
  },
  name: {
    type: Sequelize.STRING,
    field: 'name'
  },
  destination: {
    type: Sequelize.STRING,
    field: 'destinatio'
  },
  geom: {
    type: Sequelize.BLOB,
    field: 'geom'
  }
}, {
  timestamps: false,
  freezeTableName: true 
});




// uncomment after placing your favicon in /public
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use("/", router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

app.locals.arctic = arctic;
/*
console.log(arctic);
arctic.findAll({ where: {mmsi: '273365280'} }).then(function(project) {
  console.log("project: ", project)
})
*/

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/time/:year/:month/:day/:hour', function(req, res, next) {
  var sql = 'select ST_AsGeoJSON(geom) as geometry from "shipping" WHERE mmsi = \'273350610\';';
  //console.log(sql);
  sequelize.query(sql, arctic).then(function(result){
    console.log("result: ", result[0])
    results = result[0]
    var featureCollection = new FeatureCollection();
    for (i = 0; i < results.length; i++)
    {
        vals = JSON.parse(results[i].geometry)
        featureCollection.features[i] = {"geometry":vals};
    }
    res.send(featureCollection);
    res.end();
    
  });
});

// GeoJSON Feature Collection
function FeatureCollection(){
    this.type = 'FeatureCollection';
    this.features = new Array();
}

module.exports = app;
/*
// RetrieveCadastre
function RetrieveCadastre(bounds, res){
 
    var connString = 'tcp://spatial:spatial@localhost/Spatial';
 
    pg.connect(connString, function(err, client) {
 
        var sql = 'select ST_AsGeoJSON(geog) as shape ';
        sql = sql + 'from spatial.state_1 ';
        sql = sql + 'where geog && ST_GeogFromText(\'SRID=4326;POLYGON(($1 $2,$3 $4,$5 $6,$7 $8,$9 $10))\') ';
        sql = sql + 'and ST_Intersects(geog, ST_GeogFromText(\'SRID=4326;POLYGON(($11 $12,$13 $14,$15 $16,$17 $18,$19 $20))\'));';
        
        var vals = [bounds._southWest.lng, bounds._southWest.lat, bounds._northEast.lng, bounds._southWest.lat, bounds._northEast.lng, bounds._northEast.lat, bounds._southWest.lng, bounds._northEast.lat, bounds._southWest.lng, bounds._southWest.lat];
        var vals = vals.concat(vals);
        
        client.query(sql, vals, function(err, result) {
            var featureCollection = new FeatureCollection();
 
            for (i = 0; i < result.rows.length; i++)
            {
                featureCollection.features[i] = JSON.parse(result.rows[i].shape);
            }
 
            res.send(featureCollection);
        });
    });
}
 
// GeoJSON Feature Collection
function FeatureCollection(){
    this.type = 'FeatureCollection';
    this.features = new Array();
}*/
