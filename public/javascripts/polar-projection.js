window.currLayer = null;
window.animationTime = 100;
window.theMap = null;
window.styleMap = null;
window.destProj = new OpenLayers.Projection("EPSG:3572");

window.typeRules;
window.mapExtent;
window.prevSeaiceLayer = null;

window.currentDate = 432;
window.startDate = 0;
//window.endDate = 2952;
window.endDate = 17712;
window.pauseAnimation=false;
window.draggingPause = false;
window.bering = false;
window.flagStates = ["All"];
window.categories = null;

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

  var extent = new OpenLayers.Bounds(-9036842.762,-9036842.762, 9036842.762, 9036842.762);
  //var extent = new OpenLayers.Bounds(-2927693.055900,-3248119.031000,3059854.14560,2356883.213300);
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
  gj_url = getJSONURLForCurrentDate();
  //gj_url = "data/test.json"
  geojson_layer = new OpenLayers.Layer.Vector("GeoJSON",{
    strategies: [new OpenLayers.Strategy.Fixed()],
    styleMap: window.styleMap,  
    projection: destProj,
    protocol: new OpenLayers.Protocol.HTTP({
      url: gj_url,
      format: new OpenLayers.Format.GeoJSON(),
    })
  }); 

  window.currLayer = geojson_layer;

  var imgStat = 'http://nsidc.org/cgi-bin/atlas_north?service=WMS&version =1.1.1&request =GetMap&srs=EPSG:3572&transparent=true&format=image/png&width=1000&height=1000&bbox=-9036842.762,-9036842.762, 9036842.762, 9036842.762&layers=sea_ice_extent_01'
  seaiceURL = getSeaiceURLForCurrentDate()
  layer = new OpenLayers.Layer.Image(
      'Seaice',
      seaiceURL,
      extent,
      new OpenLayers.Size(353, 341),
      { isBaseLayer: false,
        opacity: 1.0,
        displayOutsideMaxExtent: false
      }
  );
  layer.id = "seaice";
  var zoom = new OpenLayers.Control.Zoom(new OpenLayers.Pixel(10,850));

  theMap = new OpenLayers.Map('map', {
      projection:destProj,
      layers:[ginaLayer, layer],
      maxExtent:extent,
      restrictedExtent:extent
  });

  theMap.addLayer(geojson_layer);
  //89687.263964845 N, 2590151.0708066 E
  //-326515.74204492 N, 3468251.4160566 E
  theMap.setCenter(new OpenLayers.LonLat(1531154.749788,  -485366.49372071),3);
  var panel = new OpenLayers.Control.CustomNavToolbar();
  theMap.addControl(panel);

  window.animateTimer = window.setInterval(incrementDate, window.animationTime);

  setupFlagText();


  var click = new OpenLayers.Control.Click();
  theMap.addControl(click);
  click.activate();
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
  return build_geojson_url_from_date();
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


function loadShipCategories(){
  var typeRules = new Array();
  
  $.getJSON( "data/new_ship_categories.json", function( data ) {
      var x=0
      categories = [];

      $.each( data, function( key, value ) {
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
          x+=1
      });

      categories.sort();
      window.categories = categories;
    
      for(i in categories){
        cat = categories[i];
        var selval = i;
        optionval = '<option value='+selval+'>'+cat+'</option>';
        $('.shipping_types').append(optionval)
      }
      sts = window.styleMap.styles['default'];
      if(sts != null){
        sts.rules = [typeRules[4]];
      }

      $(".shipping_types").change(function(){
        var val = getShippingType();
        setNewRuleFilters(val);
        updateLayers(true);
        buildLegend();
      });
      window.typeRules = typeRules;
      $('.shipping_types option[value=4]').prop('selected', true);
      buildLegend();
    });

  return typeRules;
}
function buildLegend(){

  var cat = getShippingType();
  console.log(cat);
  
  $('.categories').empty();
  if(cat == 100){

    console.log("all");
    for(i in window.categories){
      var category = window.categories[i];
      colordiv = '<div class="colorswatch" style="background-color:'+nav_colors[category]+'"><div class="legend-text">'+category+'</div></div>';
      $('.categories').append(colordiv);
    }
  } else {
    var category = window.categories[cat];
    colordiv = '<div class="colorswatch" style="background-color:'+nav_colors[category]+'"><div class="legend-text">'+category+'</div></div>';
    $('.categories').append(colordiv);
  }
  seaicediv = '<div class="colorswatch" style="background-color:white"><div class="legend-text">Sea Ice</div></div>';
   $('.categories').append(seaicediv);
}

function getShippingType(){
  return $( "#shipping_types option:selected").val();
}
function getShippingValue(){
  return $( "#shipping_types option:selected").text();
}


function setNewRuleFilters(val){
  sts = window.styleMap.styles['default'];
  var newrules = null;
  if(val == 100){
    newrules = window.typeRules;
  } else {
    newrules = [window.typeRules[val]];
  }
  sts = window.styleMap.styles['default'];
  if(sts != null){
    sts.rules = newrules;
  }
}

function getNumBaseLayers(){
  var ginalayer = window.theMap.getLayer("gina");
  var seaicelayer = window.theMap.getLayer("seaice");
  var oldSeaIceLayer = window.theMap.getLayer("oldseaice");
  var numbase = 0;
  if(ginalayer){
    numbase+=1;
  } 
  if(seaicelayer){
    numbase+=1;
  }
  if(oldSeaIceLayer){
    numbase+=1;
  }
  return numbase;
}

function updateLayers(remove_old_markers){

  newurl = getJSONURLForCurrentDate();
  numbaselayers = getNumBaseLayers();

  currLayer = new OpenLayers.Layer.Vector("GeoJSON",{
    strategies: [new OpenLayers.Strategy.Fixed()],
    styleMap: window.styleMap,  
    projection: window.destProj,

    protocol: new OpenLayers.Protocol.HTTP({
      url: newurl,
      format: new OpenLayers.Format.GeoJSON()
    })
  });
  
  all_layers = window.theMap.layers;
  numlayers = window.theMap.getNumLayers();
  cleanupSeaIce(remove_old_markers);
  if(remove_old_markers){
    for(i=numlayers;i>=numbaselayers;i--){
      killLayer(all_layers[i])
    }
  } else{
    for(i=numlayers-1;i>=numbaselayers;i--){
      if((i == numbaselayers && shouldRemoveLayers(numlayers))){
        //remove the bottom most layer, should be the oldest
        killLayer(all_layers[i])
      } else {
        //scale opacity based on number of layers
        opacityAdjuster = 1/numlayers;
        
        if(i == numlayers-1){
          opacity = 1.0;
        } else {
          opacity = i*opacityAdjuster;
        } 
        all_layers[i].setOpacity(opacity);
      }
    }    
  }

  window.theMap.addLayer(currLayer);
  updateDate(newurl);
  
  oldSeaIceLayer = window.theMap.getLayer("oldseaice");
  if(oldSeaIceLayer){
    killLayer(oldSeaIceLayer);
  } 
}


function killLayer(lyr){
  window.theMap.removeLayer(lyr);   
  lyr.destroy(); 
}

function cleanupSeaIce(remove_old_markers){
    currdate = parseCurrentDate();

    if((currdate.hour == 0 && currdate.minute == 0) || remove_old_markers){
      prevlayer = all_layers[i]
      seaiceurl = getSeaiceURLForCurrentDate();
      seaiceLayer = new OpenLayers.Layer.Image(
          'SeaIce',
          seaiceurl,
          window.mapExtent,
          new OpenLayers.Size(353, 341),
          { isBaseLayer: false,
            opacity: 1.0,
            displayOutsideMaxExtent: false
          }
      );

      oldSeaIceLayer = window.theMap.getLayer("seaice");
      if(oldSeaIceLayer){
          oldSeaIceLayer.id = "oldseaice"
      }
      seaiceLayer.id = "seaice";
      
      window.theMap.addLayer(seaiceLayer);
      window.theMap.setLayerIndex(seaiceLayer, 1)
      window.theMap.setLayerIndex(oldSeaIceLayer, 2);

      if(oldSeaIceLayer){
        oldSeaIceLayer.setOpacity(0.2);
      }
    }
}
function numMaxLayers(){
  return 22
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

function build_geojson_url_from_date(){
  shippingval = getShippingValue();
  flagval = getFlagValue();
  if(window.theMap){
    bounds = window.theMap.getExtent();
  }
  return "http://localhost:3000/time/"+window.currentDate+"/"+shippingval+"/"+flagval;
}

function getFlagValue(){
  return window.flagStates.toString();
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

function setupFlagText(){
  try{
    var fs = FlagStates.flagStates;
    var ddparent = $("#timepanel");
    $("#flagstate").select2({
      data: fs,
      allowClear:true,
      placeholder: 'Enter a Country Name',
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
