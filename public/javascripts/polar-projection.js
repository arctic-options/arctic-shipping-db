

window.urlPrefix = "http://localhost:3000"

window.currLayer = null;
window.animationTime = 150;
window.slowAnimationTime = 500;
window.theMap = null;
window.styleMap = null;
window.destProj = new OpenLayers.Projection("EPSG:3572");

window.typeRules;
window.mapExtent;

window.currentDate = 432;
window.startDate = 0;
//window.endDate = 2952;
window.endDate = 17712;
window.pauseAnimation=false;
window.draggingPause = false;
window.bering = false;

window.flagStates = ["All"];
window.categories = null;
window.shiptypes = null;
window.prevSeaIce = null;
window.currSeaIce = null;
window.prevFinished = false;

window.maxShipLength = 350;
window.minShipLength = 0;
window.maxShipWidth = 80;
window.minShipWidth = 0;

//(-5955554.0585227,-4707645.05374313,5619445.9414773,4567354.94625687)
//(-9036842.762,-9036842.762, 9036842.762, 9036842.762)
//(9947619.660797345,-12487578.50853397,9962380.339202656,12502339.18693928)
//(-4416084.91196798,-4221191.0136816, 4408915.08803202, 4303808.9863184);

function init(){
  var slider = $("#time-slider");
  slider.slider({
    animate:"fast",
    value:window.currentDate,
    min:startDate, 
    max:endDate,
    
  });

  slider.on("slidestop", function(event, ui) {
    window.draggingPause = false;
    changeSliderValue(ui.value);
    
  });
  slider.on("slidestart", function(event, ui){
    window.draggingPause = true;
  });


  $( "#pause-button" ).click(function(){
    window.pauseAnimation = true;
    updatePauseText();
  });

  $( "#play-button" ).click(function(){
    window.pauseAnimation = false;
    updatePauseText();
  });

  $( "#flagstate-filter" ).click(function(){
    updateLayers(true);
  });

  $( "#shiplength" ).slider({
    range: true,
    min: 0,
    max: 350,
    values: [ 50, 250 ],
    stop: function( event, ui ) {
      updateLayers(true);
    },
    slide: function(event, ui) {
      var minlength = getCurrentShipMinLength();
      var maxlength = getCurrentShipMaxLength();
      $('.shiplength_min').text("Minimum: "+minlength);
      $('.shiplength_max').text("Maximum: "+maxlength);
    }
  });
  $( "#shipwidth" ).slider({
    range: true,
    min: 0,
    max: 80,
    values: [ 10, 50 ],
    stop: function( event, ui ) {
      updateLayers(true);
    },
    slide: function(event, ui) {
      var minlength = getCurrentShipMinWidth();
      var maxlength = getCurrentShipMaxWidth();
      $('.shipwidth_min').text("Minimum: "+minlength);
      $('.shipwidth_max').text("Maximum: "+maxlength);
    }
  });
  var extent = new OpenLayers.Bounds(-9036842.762,-9036842.762, 9036842.762, 9036842.762);

  window.mapExtent = extent;
  Proj4js.defs["EPSG:3572"] = "+title=Arctic Polar Stereographic +proj=laea +lat_0=90 +lon_0=-180 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m +no_defs";

  var sourceProj = new OpenLayers.Projection("EPSG:4326");
 
  ginaLayer = new OpenLayers.Layer.WMS(
   "GINA WMS",
   "http://wms.alaskamapped.org/bdl/",
   {
    layers: 'BestDataAvailableLayer' //layer wms name
   },
   {
    animationEnabled:true,
    isBaseLayer:true,
    transitionEffect: 'resize',
   }
  );
  ginaLayer.id = "gina";

  var tr = loadShipCategories();
  point_style = new OpenLayers.Style({
    rules: tr
  });
  
  window.styleMap = new OpenLayers.StyleMap({'default':point_style});
  window.styleMap.styles['default'].rules = tr;

  gj_url = getJSONURLForCurrentDate();
  //gj_url = "data/test.json"
  geojson_layer = new OpenLayers.Layer.Vector("markers",{
    strategies: [new OpenLayers.Strategy.Fixed()],
    styleMap: window.styleMap,  
    projection: destProj,
    protocol: new OpenLayers.Protocol.HTTP({
      url: gj_url,
      format: new OpenLayers.Format.GeoJSON(),
    })
  }); 
  geojson_layer.events.on({"loadend": function(e){updateCountText(e.object.features.length)}});
  window.currLayer = geojson_layer;

  var imgStat = 'http://nsidc.org/cgi-bin/atlas_north?service=WMS&version =1.1.1&request =GetMap&srs=EPSG:3572&transparent=true&format=image/png&width=1000&height=1000&bbox=-9036842.762,-9036842.762, 9036842.762, 9036842.762&layers=sea_ice_extent_01'
  seaiceURL = getSeaiceURLForCurrentDate();
  seaiceID = 'seaice'+window.currentDate;
  window.currSeaIce = seaiceID;
  layer = new OpenLayers.Layer.Image(
      seaiceID,
      seaiceURL,
      extent,
      new OpenLayers.Size(353, 341),
      { isBaseLayer: false,
        opacity: 1.0,
        displayOutsideMaxExtent: false,
      }
  );
  
  var zoom = new OpenLayers.Control.Zoom(new OpenLayers.Pixel(10,850));

  theMap = new OpenLayers.Map('map', {
      projection:destProj,
      layers:[ginaLayer, layer],
      maxExtent:extent,
      restrictedExtent:extent
  });

  theMap.addLayer(geojson_layer);

  theMap.setCenter(new OpenLayers.LonLat(1531154.749788,  -485366.49372071),3);
  var panel = new OpenLayers.Control.CustomNavToolbar();
  theMap.addControl(panel);

  window.animateTimer = window.setInterval(incrementDate, window.animationTime);
  setupFlagText();

}

function getAnimationTime(){
  var stypes = getShippingTextValues();
  var fstate = getSelectedFlagValue();
  if(stypes.length == 0 && fstate.length == 0 && isDefaultShipWidth() && isDefaultShipLength()){
    return window.slowAnimationTime;
  } else {
    console.log("not default, using fast animation time")
    return window.animationTime;
  }
}

function getSeaIceLayer(which_layer){
  if(which_layer == null){
    return null;
  } else {
    var lyrs = window.theMap.getLayersByName(which_layer); 
    if(lyrs != null){
      return lyrs[0]
    } else {
      return null
    }
  }
  
}
function goToBering(){
  if(window.bering){
    latlong = new OpenLayers.LonLat(-897927,-2581314);
    zoomlevel = 5;
  } else {
    latlong = new OpenLayers.LonLat(-172087,-1234069)
    zoomlevel = 3;
  }
  window.theMap.setCenter(latlong,zoomlevel);
  if(window.bering){
    $( "#bering-zoomin-button" ).hide();
    $( "#bering-zoomout-button" ).show();
  } else {
    $( "#bering-zoomin-button" ).show();
    $( "#bering-zoomout-button" ).hide();
  }
}

function updatePauseText(){
  text = window.pauseAnimation ? "Play Animation" : "Pause Animation"
  if(window.pauseAnimation){
    $( "#play-button" ).show();
    $("#pause-button").hide();
  } else{
    $( "#pause-button" ).show();
    $("#play-button").hide();
  }
}

function isPaused(){
  return (window.draggingPause || window.pauseAnimation);
}

function changeSliderValue(newDate){
  window.currentDate = newDate;
  updateLayers(true);
}

function incrementDate(){
  if(isPaused()){
    return;
  }
  newDate = window.currentDate+1;
  if(newDate > endDate){
    return;
  }
  window.currentDate = newDate;

  $( "#time-slider" ).slider( "value", window.currentDate );
  updateLayers(false);
}

function getJSONURLForCurrentDate(){
  shippingval = getShippingTextValues();
  console.log("shippingval: ", shippingval);
  if(shippingval == null || shippingval.length == 0){
    shippingval = "None";
  }
  var size = "None"
  if(!isDefaultShipLength() || !isDefaultShipWidth()){
    var minlength = getCurrentShipMinLength();
    var maxlength = getCurrentShipMaxLength();
    var minwidth = getCurrentShipMinWidth();
    var maxwidth = getCurrentShipMaxWidth();
    size = minlength+":"+maxlength+":"+minwidth+":"+maxwidth;
  }
  flagval = getSelectedFlagValue();
  var url = window.urlPrefix+"/time/"+window.currentDate+"/"+shippingval+"/"+flagval+"/"+size;
  return url;
}
function isDefaultShipLength(){
  return (getCurrentShipMaxLength() == window.maxShipLength && getCurrentShipMinLength() == window.minShipLength);
}
function isDefaultShipWidth(){
  return (getCurrentShipMaxWidth() == window.maxShipWidth && getCurrentShipMinWidth() == window.minShipWidth);
}

function getCurrentShipMinWidth(){
  var minwidth =  $( "#shipwidth" ).slider("option", "values")[0];
  return minwidth;
}

function getCurrentShipMaxWidth(){
  var maxw = $( "#shipwidth" ).slider("option", "values")[1];
  return maxw;
}
function getCurrentShipMinLength(){
  var minl  = $( "#shiplength" ).slider("option", "values")[0];
  return minl;
}
function getCurrentShipMaxLength(){
  var maxl = $( "#shiplength" ).slider("option", "values")[1];
  return maxl;
}
function getSeaiceURLForCurrentDate(){
  var dt = parseCurrentDate();
  return build_seaice_url_from_date(dt.year, dt. month, dt.day);
}

function parseCurrentDate(){
  currdate = window.currentDate;
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

function buildLegend(){
  var shipping_cats = getShippingTextValues();
  $('.categories').empty();
  if(shipping_cats.length == 0){
    var shipping_cats = window.categories;
    for(cat in shipping_cats){
      var category = shipping_cats[cat];
      colordiv = '<div class="colorswatch" style="background-color:'+nav_colors[category]+'"><div class="legend-text">'+category+'</div></div>';
      $('.categories').append(colordiv);
    }
  } else {
    for(cat in shipping_cats){
      var category = shipping_cats[cat];
      colordiv = '<div class="colorswatch" style="background-color:'+nav_colors[category]+'"><div class="legend-text">'+category+'</div></div>';
      $('.categories').append(colordiv);
    }    
  }

  
  seaicediv = '<div class="colorswatch" style="background-color:white"><div class="legend-text">Sea Ice</div></div>';
   $('.categories').append(seaicediv);
}


function getShippingTextValues(){
  var selectedKeys = $("#shipping_types").val();
  console.log("shipping keys: ", selectedKeys);
  if(selectedKeys == null){
    return [];
  }
  var stvals = [];
  for(var i=0;i<selectedKeys.length;i++){
    var key = parseInt(selectedKeys[i]);
    
    var val = getShipTypeForId(key);
    stvals.push(val);
  }
  console.log("shipping text: ", stvals.toString());
  return stvals;   
}

function getShipTypeForId(id){
  var stypes = window.shiptypes;
  console.log("window ship types are ", stypes);
  for(var i=0;i<stypes.length;i++){
    if(stypes[i] != null && stypes[i].id == id){
      return shiptypes[i].text;
    }
  }
}


function loadAllRuleFilters(typeRules){
  sts = window.styleMap.styles['default'];
  sts.rules = typeRules;
}

function updateLayers(remove_old_markers){
  if(remove_old_markers){
    animationTime = getAnimationTime();
    if(animationTime == window.slowAnimationTime){
      clearInterval(window.animateTimer);
      window.animateTimer = window.setInterval(animationTime);
    }
  }

  newurl = getJSONURLForCurrentDate();
  currLayer = new OpenLayers.Layer.Vector("markers",{
    strategies: [new OpenLayers.Strategy.Fixed()],
    styleMap: window.styleMap,  
    projection: window.destProj,
    protocol: new OpenLayers.Protocol.HTTP({
      url: newurl,
      format: new OpenLayers.Format.GeoJSON()
    })
  });
  currLayer.events.on({"loadend": function(e){updateCountText(e.object.features.length)}});
  cleanupSeaIce(remove_old_markers);
  markerlayers = window.theMap.getLayersByName("markers");

  if(markerlayers != null){
    if(remove_old_markers){
      for(i=0;i<markerlayers.length;i++){
        killLayer(markerlayers[i])
      }
    } else {
      numlayers = markerlayers.length
      for(i=numlayers-1;i>=0;i--){
        if((i == 0 && shouldRemoveLayers(numlayers))){
          //remove the bottom most layer, should be the oldest
          killLayer(markerlayers[i])
        } else {
          //scale opacity based on number of layers
          opacityAdjuster = 1/numlayers;
          
          if(i == numlayers-1){
            opacity = 1.0;
          } else {
            opacity = i*opacityAdjuster;
          } 
          markerlayers[i].setOpacity(opacity);
        }
      }    
    }
  }

  window.theMap.addLayer(currLayer);
  updateDate(newurl);
  if(window.pauseAnimation){
    currLayer.redraw();
  }
}

function updateCountText(shipcount){
  var featDict = {};
  var markerlayers = window.theMap.getLayersByName("markers");
  for(var j=0;j<=markerlayers.length;j++){
    var ml = markerlayers[j];
    
    if(ml != null && ml.features != null){

      for(var i=0;i<ml.features.length;i++){
        var feat = ml.features[i];
        
        featDict[feat.data.mmsi] = feat.data.mmsi;
        
      }
    }
  }
  var numships = Object.keys(featDict).length;
  $('.shipcount').text(numships);
}
function killLayer(lyr){
  window.theMap.removeLayer(lyr);   
  lyr.destroy(); 
}

function cleanupSeaIce(remove_old_markers){
    currdate = parseCurrentDate();
    var currSeaIceLayer = getSeaIceLayer(window.currSeaIce);

    if((currdate.hour == 0 && currdate.minute == 0) || remove_old_markers){

      seaiceurl = getSeaiceURLForCurrentDate();
      seaiceID = "seaice"+window.currentDate;
      seaiceLayer = new OpenLayers.Layer.Image(
          seaiceID,
          seaiceurl,
          window.mapExtent,
          new OpenLayers.Size(353, 341),
          { isBaseLayer: false,
            opacity: 1.0,
            displayOutsideMaxExtent: false,
          }
      );
      seaiceLayer.setZIndex(1);
      window.theMap.addLayer(seaiceLayer);

      //update the pointers to the seaice ids
      window.prevSeaIce = window.currSeaIce;
      window.currSeaIce = seaiceID;
      oldseaice = getSeaIceLayer(window.prevSeaIce);
      
      if(window.pauseAnimation){
        oldseaice.setOpacity(0.0);
      }
    } else {
      if(window.prevSeaIce != null){
        oldSeaIceLayer = getSeaIceLayer(window.prevSeaIce);
        if(oldSeaIceLayer != null){
          op = oldSeaIceLayer.opacity;
          if(op > 0){
            oldSeaIceLayer.setOpacity(op-0.2);
          } else {
            killLayer(oldSeaIceLayer);
          }
        }
      }
    }
}

function numMaxLayers(){
  return 20;
}
function shouldRemoveLayers(numlayers){
   return numlayers > numMaxLayers();
}

function getMinute(minchunk){
  if(minchunk == 0){
    return "00";
  } else {
    return minchunk*6;
  }
}

function updateDate(url){
  var dt = parseCurrentDate();
  monthtext = getMonthText(dt.month);
  newtime = monthtext+" "+dt.day+", "+dt.year+", "+dt.hour+":00";
  $("#datelabel").text(newtime);
}
function getMonthText(month){
  var monthNames = ["Jan.", "Feb.", "March", "April", "May", "June",
    "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."
  ];
  return monthNames[month-1];
}

function getSelectedFlagValue(){
  var val = window.flagStates.toString();
  if(val == null || val.trim().length == 0 || val == ["All"]){
    val = "All"
  }
  return val;
}

function build_seaice_url_from_date(year, month, day, hour){
  pre = "images/masie_seaice/masie_ice_r00_v01_2014";
  post = "_4km.png";
  dim = {7:31, 8:31, 9:30, 10:31}
  var startday = 183;
  for (var key in dim) {
    if (dim.hasOwnProperty(key)) {
      if(key < month){
        startday+=dim[key]
      }
    }
  }
  startday = startday+day;
  if(startday < 10){
    startday = "00"+startday;
  } else if (startday < 100){
    startday = "0"+startday
  } 
  
  return pre+startday+post;
}


nav_colors = {
    "Cargo and Tanker": "aqua", 
    "Diving": "LightSkyBlue", 
    "Dredging": "green", 
    "Enforcement and Safety": "red", 
    "Fishing": "#FFFF33", 
    "Icebreaker": "DarkOrange", 
    "Military": "indigo", 
    "Other": "crimson", 
    "Passenger & Cruise Ships": "mediumorchid", 
    "Research": "limegreen", 
    "Sailing": "pink",
    "Tug": "orange", 
    "Unknown": "beige", 
    "Working & Support": "LightGreen"
}
/*
OpenLayers.Control.Click = OpenLayers.Class(OpenLayers.Control, {                
    defaultHandlerOptions: {
        'single': true,
        'double': false,
        'pixelTolerance': 0,
        'stopSingle': false,
        'stopDouble': false
    },
    initialize: function(options) {
        this.handlerOptions = OpenLayers.Util.extend(
            {}, this.defaultHandlerOptions
        );
        OpenLayers.Control.prototype.initialize.apply(
            this, arguments
        ); 
        this.handler = new OpenLayers.Handler.Click(
            this, {
                'click': this.trigger
            }, this.handlerOptions
        );
    }, 
    trigger: function(e) {
        var lonlat = window.theMap.getLonLatFromPixel(e.xy);
        alert("You clicked near " + lonlat.lat + " N, " +
                                  + lonlat.lon + " E");
    }
});
*/

function getFlagTextForId(flagstates, id){
  for(var i=0;i<flagstates.length;i++){
    if(flagstates[i].id == id){
      var t = flagstates[i].text;
      if(t == "China (People's Republic of)"){
        return "China (People";
      } else {
        return t;
      }
    }
  }
  return "";
}

function loadShipCategories(){
  var typeRules = new Array();
  var shipCategories = getAllShipCategories();
  var categories = new Array();
  $.each( shipCategories, function( key, value ) {
    categories.push(key);
    type_filters = [];
    for(stype in value){
      newfilter = new OpenLayers.Filter.Comparison({
                    type: OpenLayers.Filter.Comparison.EQUAL_TO,
                    property: "type", 
                    value: value[stype]
                  });
      type_filters.push(newfilter);
    }

    logic_filter =  new OpenLayers.Filter.Logical({
                        type: OpenLayers.Filter.Logical.OR,
                        filters: type_filters
                    });

    rule = new OpenLayers.Rule({
          filter: logic_filter,
          symbolizer: {
            fillColor:nav_colors[key],
            fillOpacity:1.0,
            strokeWidth:1.0,
            strokeColor:nav_colors[key],
            strokeOpacity:0.1,
            pointRadius:2,
          }
    });
    typeRules.push(rule);
  });

  categories.sort();
  var shiptypes = [{id:0, text:"Cargo and Tanker"}, 
                  {id:1, text:"Diving"}, 
                  {id:2, text:"Dredging"}, 
                  {id:3, text: "Enforcement and Safety"}, 
                  {id:4, text:"Fishing"}, 
                  {id:5, text:"Icebreaker"}, 
                  {id:6, text:"Military"}, 
                  {id:7, text:"Other"}, 
                  {id:8, text:"Passenger & Cruise Ships"}, 
                  {id:9, text:"Research"}, 
                  {id:10, text:"Sailing"},
                  {id:11, text:"Tug"}, 
                  {id:12, text:"Unknown"}, 
                  {id:13, text:"Working & Support"}];

  window.shiptypes = shiptypes;


  window.categories = categories;
  $("#shipping_types").select2({
    data: shiptypes,
    allowClear:false,
    placeholder: 'Enter a Ship Type',
    multiple:true
  });

  $(".shipping_types").val("4");
  $(".shipping_types").change(function(){
    //setNewRuleFilters();
    updateLayers(true);
    buildLegend();
  });

  buildLegend();
  return typeRules;
}

function setupFlagText(){
  try{
    var fs = FlagStates.flagStates;
    var ddparent = $("#timepanel");
    $("#flagstate").select2({
      data: fs,
      allowClear:true,
      placeholder: {
        id: -1,
        text: 'Enter a Country Name',
      },
      multiple:true
    });

    $("#flagstate").select2().on("change", function(e) {
      var selectedKeys = $("#flagstate").select2().val();
      var fsvals = [];
      if(selectedKeys == null || selectedKeys.length == 0){
        fsvals.push("All")
      } else{
        for(var i=0;i<selectedKeys.length;i++){
          var key = parseInt(selectedKeys[i]);
          
          var val = getFlagTextForId(fs, key);
          fsvals.push(val);
        }
      }
      window.flagStates = fsvals;
      updateLayers(true);
    });
  } catch(err){

  }
}

function getAllShipCategories(){
  return {
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
  };
}
