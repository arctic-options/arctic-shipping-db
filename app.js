var express = require('express');
var router = express.Router();
var path = require('path');
var Sequelize = require('sequelize');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors');
var http = require('http');
var app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
//sequelize setup
var sequelize = new Sequelize('arctic', 'dan_yocum', 'fitzBot1', {
  host: 'localhost',
  dialect: 'postgres',

  pool: {
    max: 5,
    min: 0,
    idle: 10000
  },

});

//connect to shipping table
var arctic = sequelize.define('shipping2', {
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
  flag: {
    type: Sequelize.STRING,
    field: 'flag'
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


app.use(cors());
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

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/time/:currdate/:shiptype/:flagstates/:shipsize', function(req, res, next) {
  try{
    thedate = parseCurrentDate(req.params.currdate);

    shipping_type = req.params.shiptype;
    year = thedate.year;
    month = padValue(thedate.month);
    day = padValue(thedate.day);
    hour = padValue(thedate.hour);
    minute = parseInt(thedate.minute);

    startminute = getMinute(minute);
    endminute = getMinute(minute+1);

    start_date = year+"-"+month+"-"+day+" "+hour+":"+startminute+":00";
    end_date = year+"-"+month+"-"+day+" "+hour+":"+endminute+":00";

    var typeclause = parseTypeClause(shipping_type);
    var flagclause = parseFlagStates(req.params.flagstates, shipping_type.length != 0);


    var bothempty = (flagclause.trim().length == 0 && typeclause.trim().length == 0);
    var sizeclause = parseSizeClause(req.params.shipsize, !bothempty);
    console.log("sizeclause: ", sizeclause)
    featureCollection = new FeatureCollection();

   
    var clauses = typeclause+flagclause+sizeclause;
    if(clauses.length > 0){
      clauses+= " AND ";
    }

    //ST_AsGeoJSON(geom) as geometry
    var sql = 'SELECT row_to_json(shipping2) as properties, ST_AsGeoJSON(geom,4,2) as geometry from shipping2 where '+clauses+' ( datetime >= \''+start_date+'\' AND datetime < \''+end_date+'\');';

    sequelize.query(sql, arctic).then(function(result){
      results = result[0];
      for (i = 0; i < results.length; i++)
      {
          vals = JSON.parse(results[i].geometry)
          feat = results[i];
          featureCollection.features[i] = {"geometry":vals, "type":"Feature", "properties":feat.properties};
      }
      res.send(featureCollection);
      res.end();
      
    });
  } catch(err){
    console.log("error searching: ",err)
  }
});

function parseFlagStates(flagstates, addAnd){
  flagclause = ""
  var fs_keys = flagstates.split(',');
  
  try{
    if(fs_keys.length == 1 && fs_keys[0].trim() == "All"){
      return "";
    } else {
      
      for(var i=0;i<fs_keys.length;i++){
        
        if(i == 0){
          flagclause+= " AND ( ";
        }
        if(i == fs_keys.length - 1){
          flagclause+=" flag LIKE \'"+fs_keys[i]+"\%') AND ";
        } else {
          flagclause+=" flag LIKE \'"+fs_keys[i]+"\%' OR ";
        }
      }
      return flagclause;
    }
  } catch(err){
    console.log(err);
  }
  return flagclause;
}

function parseTypeClause(shiptype){
  typeclause = "";
  if(shiptype == "None"){
    return typeclause;
  }
  try{
    shiptype_keys = shiptype.split(',');
    var subcats = [];
    for(var i=0;i<shiptype_keys.length;i++){
      shiptype = shiptype_keys[i];
      subcats_for_shiptype = getShipTypeSubcategories(shiptype);

      for(var j=0;j<subcats_for_shiptype.length;j++){
        subcats.push(subcats_for_shiptype[j]);
      }
    }

    for (var i=0;i<subcats.length;i++){
      if(i == 0){
        typeclause+="( ";
      }
      if(i == subcats.length - 1){
        typeclause+=" type = \'"+subcats[i]+"\') ";
      } else {
        typeclause+= "type = \'"+subcats[i]+"\' OR ";
      }
    }
  } catch(err){
    console.log(err)
  }

  return typeclause;
}
function parseSizeClause(sizes, addAnd){
  sizeclause = "";
  if(sizes == "None"){
    return ""
  } else {
    lws = sizes.split(':');
    minlength = lws[0];
    maxlength = lws[1];
    minwidth = lws[2];
    maxwidth = lws[3];
    if(addAnd){
      sizeclause = "AND (";
    } else {
      sizeclause = "( ";
    }
    //(width != 'Unknown' AND to_number(width, '999999') > 80)
    sizeclause+=" (width != 'Unknown' AND (to_number(width, '999') <= "+maxwidth+" AND to_number(width, '999') >= "+minwidth+")) AND";
    sizeclause+=" (length != 'Unknown' AND (to_number(length, '999') <= "+maxlength+" AND to_number(length, '999') >= "+minlength+"))";
    sizeclause+=")"
  }
  return sizeclause;
}
function getShipTypeSubcategories(shiptype){
  var cats = getShipTypeCategories();
  var subcats = cats[shiptype];
  return subcats;
}

function getMinute(minute){
  if(minute == 0){
    return "00";
  } else {
    return ""+(10*minute);
  }
}
// GeoJSON Feature Collection
function FeatureCollection(){
    this.type = 'FeatureCollection';
    this.features = new Array();
}
function Feature(){
  this.type = 'properties';

}
function parseCurrentDate(currdate){

  var year = 2014;
  
  //note: these arent actually minutes, they're ten minute chunks
  var mins_in_july = 4464;
  var mins_in_august = 8928;
  var mins_in_sept = 13248;
  var mins_in_oct = 17712;

  var minchunk = 24*6;
  
  if(currdate > mins_in_july){
    if(currdate > mins_in_august){
      if(currdate > mins_in_sept){
        //its in october
        month = 10;
        dayoffset = 92;
      } else {
        //its in september
        month = 9;
        dayoffset = 62;
      }
    } else {
      //its in august
      month = 8;
      dayoffset = 31;
    }
  } else {
        month = 7;
        dayoffset = 0
  }
  day =  Math.floor(currdate/(24*6)) - dayoffset;
  var hourremainder = (currdate - ((dayoffset+day)*24*6))
  hour = Math.floor(hourremainder/6);
  minremainder = hourremainder - hour*6
  minute = minremainder;
  var vals = {"year":year, "month":month,"day":day+1, "hour":hour, "minute": minute}
  return vals;
}

function padValue(strval){
  val = parseInt(strval);
  if(val < 10){
    return "0"+val
  } else {
    return ""+val
  }
}


function getShipTypeCategories(){
  cats = {
    "Cargo and Tanker": [
      "Cargo ship",
      "Tanker"
    ], 
    "Diving": [
      "Dive boat"
    ], 
    "Dredging": [
      "Dredging"
    ], 
    "Enforcement and Safety": [
      "Law enforcement vessel",
      "Search and rescue",
      "Medical transport"
    ], 
    "Fishing": [
      "Fishing"
    ], 
    "Icebreaker": [
      "Icebreaker"
    ], 
    "Military": [
      "Military"
    ], 
    "Other": [
      "Local vessel",
      "Wing in ground",
      "High speed craft",
      "Ships and aircraft of States not parties to an armed conflict"
    ], 
    "Passenger & Cruise Ships": [
      "Pleasure craft"
    ], 
    "Research": [
      "Research",
      "Research Vessel"
    ], 
    "Sailing": [
      "Sailing"
    ], 
    "Tug": [
      "Tug"
    ], 
    "Unknown": [
      "Unknown"
    ], 
    "Working & Support": [
      "Pilot vessel",
      "Port tender",
      "Anti-pollution vessel",
      "Towing" 
    ]
  }
  return cats;
}

function getFlagStates(){
  var fs = [ {id:0, text:"Afghanistan"},
    {id:1, text:"Alaska (State of)"},
    {id:2, text:"Antigua and Barbuda"},
    {id:3, text:"Armenia (Republic of)"},
    {id:4, text:"Australia"},
    {id:5, text:"Austria"},
    {id:6, text:"Azores"},
    {id:7, text:"Bahamas (Commonwealth of the)"},
    {id:8, text:"Barbados"},
    {id:9, text:"Belgium"},
    {id:10, text:"Belize"},
    {id:11, text:"Bermuda"},
    {id:12, text:"Brazil (Federative Republic of)"},
    {id:13, text:"British Virgin Islands"}];
  return fs;
}
module.exports = app;

