window.currLayer = null;
window.animationTime = 350;
window.theMap = null;
window.styleMap = null;
window.destProj = new OpenLayers.Projection("EPSG:3572");
window.filterRules={}
window.typeRules;
window.mapExtent;
window.prevSeaiceLayer = null;
window.currentDate = 72;
window.startDate = 0;
window.endDate = 2952;
window.pauseAnimation=true;
window.draggingPause = false;
window.bering = false;

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
    window.pauseAnimation = !window.pauseAnimation;
    updatePauseText();
  });
  $( "#bering-button" ).click(function(){
    window.bering = !window.bering;
    goToBering();
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
    attribution: 'Best Data Layers provided by <a href="http://www.gina.alaska.edu">GINA</a>',
   }
  );

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
    callback:handler,
    protocol: new OpenLayers.Protocol.HTTP({
      url: gj_url,
      format: new OpenLayers.Format.GeoJSON(),

    })
  }); 
  function handler(request){
    console.log("------  ",request.responseText);
  }
  window.currLayer = geojson_layer;
  geojson_layer.events.on({"loadend": function(e){console.log(window.currLayer.features)}})
  

  var imgStat = 'http://nsidc.org/cgi-bin/atlas_north?service=WMS&version =1.1.1&request =GetMap&srs=EPSG:3572&transparent=true&format=image/png&width=1000&height=1000&bbox=-9036842.762,-9036842.762, 9036842.762, 9036842.762&layers=sea_ice_extent_01'
  seaiceURL = getSeaiceURLForCurrentDate()
  layer = new OpenLayers.Layer.Image(
      'Seaice',
      seaiceURL,
      extent,
      new OpenLayers.Size(353, 341),
      { isBaseLayer: false,
        opacity: 0.9,
        displayOutsideMaxExtent: true
      }
  );
  
  theMap = new OpenLayers.Map('map', {
      projection:destProj,
      layers:[ginaLayer, layer],
      maxExtent:extent,
      restrictedExtent:extent
  });

  theMap.addLayer(geojson_layer);
  //little diomedes 65.7542° N, 168.9208° W
  //theMap.setCenter(new OpenLayers.LonLat(-897927,-2581314),5);
  //-1434069.0134063 N, -172087.76250098
  theMap.setCenter(new OpenLayers.LonLat(-172087,-1234069),3);
  var panel = new OpenLayers.Control.CustomNavToolbar();
  theMap.addControl(panel);

  window.animateTimer = window.setInterval(incrementDate, window.animationTime);
  
  var click = new OpenLayers.Control.Click();
  theMap.addControl(click);
  click.activate();
  
  //-2581314.7147314 N, -897927.99905615 E
}

function goToBering(){

  if(window.bering){
    latlong = new OpenLayers.LonLat(-897927,-2581314);
    zoomlevel = 5;
    btext = "Show the Polar Region";
  } else {
    latlong = new OpenLayers.LonLat(-172087,-1234069)
    zoomlevel = 3;
    btext = "Zoom to Bering Region";
  }
  window.theMap.setCenter(latlong,zoomlevel);
  $( "#bering-button" ).text(btext);
}
function updatePauseText(){
  text = window.pauseAnimation ? "Play Animation" : "Pause Animation"
  $( "#pause-button" ).text(text)
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
  
  var dt = parseCurrentDate();
  return build_geojson_url_from_date(dt.year, dt.month, dt.day, dt.hour);
}

function getSeaiceURLForCurrentDate(){
  var dt = parseCurrentDate();
  return build_seaice_url_from_date(dt.year, dt. month, dt.day);
}

function parseCurrentDate(){
  currdate = window.currentDate;
  year = 2014;
  
  hours_in_july = 744;
  hours_in_august = 744;
  hours_in_sept = 720;
  hours_in_oct = 744;
  numday = Math.floor(currdate/24)
  if(currdate > hours_in_july){
    if(currdate > hours_in_july+hours_in_august){
      if(currdate > hours_in_july+hours_in_august+hours_in_sept){
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
    //its in july
    month = 7;
    dayoffset = 0;
  }
  day = numday - dayoffset;
  hour = currdate - (day*24 + (dayoffset*24))

  return {"year":year, "month":month,"day":day, "hour":hour}
}

function loadShipCategories(){
  var typeRules = new Array();
  
  $.getJSON( "data/ship_categories.json", function( data ) {
      var x=0
      categories = [];

      $.each( data, function( key, value ) {
          categories.push(key);
          type_filters = [];
          for(stype in value){
            newfilter = new OpenLayers.Filter.Comparison({
                          type: OpenLayers.Filter.Comparison.NOT_EQUAL_TO,
                          property: "type", 
                          value: value[stype]
                        });
            type_filters.push(newfilter)
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
                  strokeWidth:4.0,
                  strokeColor:nav_colors[key],
                  strokeOpacity:0.1,
                  pointRadius:2,
                }
          });
          typeRules.push(rule);
          window.filterRules[key] = rule;
          x+=1
      });

      categories.sort();
      for(i in categories){
        cat = categories[i];
        var selval = i;
        colordiv = '<div style="opacity:1.0;width:16px;height:16px;margin-top:5px;margin-bottom:5px;background-color:'+nav_colors[cat]+'"><div style="margin-left:22px;margin-top:3px;margin-bottom:8px;width:250px;vertical-align:middle;">'+cat+'</div></div>';
        $('.legend').append(colordiv);
        optionval = '<option value='+selval+'>'+cat+'</option>';
        $('.shipping_types').append(optionval)
      }

      sts = window.styleMap.styles['default'];
      if(sts != null){
        sts.rules = [typeRules[4]];
      }

      $(".shipping_types").change(function(){
        var val = $( "#shipping_types option:selected").val();
        setNewRuleFilters(val);
        updateLayers(true);
      });
      window.typeRules = typeRules;
      $('.shipping_types option[value=4]').prop('selected', true);

    });

  return typeRules;
}

function getFilterRules(){
  var cats = []
  for(tr in window.filterRules){
    rule = window.filterRules[tr];
    cats.push(rule);
  }
  return cats;
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

function updateLayers(remove_old_markers){

  cleanupSeaice(window.prevSeaiceLayer);
  currUrl = window.currLayer.protocol.url;
  newurl = getJSONURLForCurrentDate();
  prevSeaiceLayer = null;
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
  
  for(i=numlayers-1;i>=1;i--){
    if(i == 1){
      currdate = parseCurrentDate();
      if(currdate.hour == 0 || remove_old_markers){
        prevlayer = all_layers[i]
        seaiceurl = getSeaiceURLForCurrentDate();
        seaiceLayer = new OpenLayers.Layer.Image(
            'SeaIce',
            seaiceurl,
            window.mapExtent,
            new OpenLayers.Size(353, 341),
            { isBaseLayer: false,
              opacity: 0.9,
              displayOutsideMaxExtent: true
            }
        );
        window.theMap.addLayer(seaiceLayer);
        window.theMap.setLayerIndex(seaiceLayer, 1)
       
        window.prevSeaiceLayer = prevlayer;
        prevlayer.visibility = false;
        if(window.pauseAnimation && remove_old_markers){
          prevlayer.setOpacity(0.0);
        }

      }
    } else if(i == 2){
      if(shouldRemoveLayers(numlayers) || remove_old_markers){
        killLayer(all_layers[i])
      }  
    } else {
      if(remove_old_markers){
        killLayer(all_layers[i])
      } else if(i > 2){
        opacity = i*0.18;
        all_layers[i].setOpacity(opacity);        
      }

      
    } 

    window.theMap.addLayer(currLayer);
  }

  updateDate(newurl);
}

function killLayer(lyr){
  window.theMap.removeLayer(lyr);   
  lyr.destroy(); 
}

function cleanupSeaice(layer){
  if(layer != null){
    layer.visibility = false;
    window.theMap.removeLayer(layer);
    layer.destroy();    
  } 
 
}

function shouldRemoveLayers(numlayers){
   return numlayers > 7;
}

function updateDate(url){
  var dt = parseCurrentDate();
  newtime = "Date: "+dt.month+"/"+dt.day+"/"+dt.year+", "+dt.hour+":00";
  
  $("#datelabel").text(newtime);

}

function build_geojson_url_from_date(year, month, day, hour){
  return "http://localhost:3000/time/"+year+"/"+month+"/"+day+"/"+hour;
  //return "data/geojson_output/shipping_"+year+"_"+month+"_"+day+"_"+hour+".json";
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
