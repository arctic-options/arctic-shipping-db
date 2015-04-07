function DataStore(){
	this.currentDate = 432;
	this.startDate = 0;
	this.endDate = 17712;
	this.dataTable = {};
	this.currDate = new Date();
	//the fourth of july
	this.currDate.setTime(1404432000000);
	//the first of july: 1404172800000
	this.loadStr = "loading...";
	this.getCurrentDay = function(){
		return this.getDayForDate(this.currentDate);
	};

	this.getCurrentDate = function(){
		var day = this.getCurrentDay();
		this.getShippingTextValues();
		return this.currentDate
	};

	this.incrementDate = function(){
		this.currentDate = this.currentDate+1;
		var newDateObj = new Date(this.currDate.getTime() + 600000);
		this.currDate = newDateObj;
	};

	this.setCurrentDate = function(newdate){
		this.currentDate = newdate;
	};

	this.getDayForDate = function(date){
		var day = Math.ceil(date/(24*6));
		return day;
	};

	this.getShippingTextValues = function(){
	  var selectedKeys = $("#shipping_types").val();
	  if(selectedKeys == null){
	    return [];
	  }
	  var stvals = [];
	  for(var i=0;i<selectedKeys.length;i++){
	    var key = parseInt(selectedKeys[i]);
	    
	    var val = getShipTypeForId(key);
	    stvals.push(val);
	  }
	  return stvals;  
	};

	this.loadMarkersForCurrentDate = function(){
		if(this.dataTable == null || this.dataTable[theday] == null){
			return;

		} else {
			markers = this.getMarkersForDate(this.getCurrentDate());
			window.currlayer.addFeatures(markers);
		}
	};
	this.getAdjustedDateKey = function(thedate){
		return thedate.getUTCFullYear()+":"+thedate.getUTCMonth()+":"+(Math.parseInt(thedate.getUTCDate())+1);
	}

	this.addMarkersForCurrentDate = function(){
		var now = this.currDate;
		var future = new Date(now.getTime() + 600000);
		var dateforkey = new Date(this.currDate.getTime());

		var key = this.getDateKey(dateforkey);
		var features = window.datastore.dataTable[key];

		if(features == this.loadStr){
			console.log("loading still....");
			return;
		} else if(this.dataTable == null || features == null){
			console.log("-------------loading features for key ", key);
			window.datastore.dataTable[key] = this.loadStr;
			this.loadMarkersForDay();
		} else {
			var featlist = [];
			for(var i=0;i<features.length;i++){
				var feat = features[i];

				var df = this.turnDatetimeIntoDate(feat.attributes.datetime);
				
				console.log("now, df, future", now.toUTCString(), df.toUTCString(), future.toUTCString());

				if(df >= now && df <= future){
					featlist.push(feat);
				}
			}
			console.log("feats: ", featlist);
			window.currLayer.addFeatures(featlist);	
		}
	};
	this.turnDatetimeIntoDate = function(datetime){
		var df = new Date(datetime);
		df.setDate(df.getDate()-1);
		return df;
	}
	this.addMarkersToDataStore = function(features){
		if(features == null || features.length == 0){
			console.log("no features to add")
			return;
		}
		
		var thedate = this.turnDatetimeIntoDate(features[0].attributes.datetime);

		var key = this.getDateKey(thedate);

		var loadMarkers = false;

		if(window.datastore.dataTable[key] == this.loadStr){
			loadMarkers = true;
		} else {
			console.log("it isn't load str...")
		}
		console.log("adding markers for key ", key);

		window.datastore.dataTable[key] = features;
		if(features != null){
			console.log("features are added ", features.length)
		}

		if(loadMarkers){
			console.log("loading markers");
			this.addMarkersForCurrentDate();	
		} else {
			console.log("ignoring load");
		}
		
	};

	this.getDateKey = function(thedate){
		return thedate.getUTCFullYear()+":"+thedate.getUTCMonth()+":"+thedate.getUTCDate();
	}

	this.loadMarkersForDay = function(){
		
		var datekey = new Date(this.currDate.getTime());


		markers = this.dataTable[datekey];
		
		
		if(markers == null || markers == this.loadStr){
			//url = this.build_geojson_url_from_day();
			var urlprefix = window.urlPrefix+"/byday";
			var flagval = getSelectedFlagValue();
			var datestr = this.currDate.getTime();
			var shippingval = this.getShippingTextValues();
			var url = urlprefix+"/"+datestr+"/"+shippingval+"/"+flagval

			$.getJSON( url )
			  .done(function( json ) {
			  	var geoj = new OpenLayers.Format.GeoJSON();
			  	var feats = geoj.read(json);
			  	window.datastore.addMarkersToDataStore(feats);
			  })
			  .fail(function( jqxhr, textStatus, error ) {
			    var err = textStatus + ", " + error;
			    console.log( "Request Failed: " + err );
			});
		} 
	};

	this.build_geojson_url_from_day = function(){
	  shippingval = this.getShippingTextValues();
	  if(shippingval == null || shippingval.length == 0){
	    shippingval = "None";
	  }
	  flagval = getSelectedFlagValue();
	  var currdate = window.datastore.currDate;
	  var url = window.urlPrefix+"/day/"+currdate.day+"/"+shippingval+"/"+flagval;

	  return url;
	};



	this.getURLForCurrentDate = function(){

	};

	this.getSelectedFlagValue = function (){
  		return window.flagStates.toString();
	};

	this.parseDate = function(currdate){

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
	
}


