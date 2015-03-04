OpenLayers.Control.CustomNavToolbar = OpenLayers.Class(OpenLayers.Control.Panel, {
    /**
     * Constructor: OpenLayers.Control.NavToolbar 
     * Add our two mousedefaults controls.
     *
     * Parameters:
     * options - {Object} An optional object whose properties will be used
     *     to extend the control.
     */
	
    initialize: function(options) {
        OpenLayers.Control.Panel.prototype.initialize.apply(this, [options]);
        this.addControls([
          new OpenLayers.Control.Navigation(),
		  //Here it come
          new OpenLayers.Control.ZoomBox({alwaysZoom:true})
        ]);
		// To make the custom navtoolbar use the regular navtoolbar style
		this.displayClass = 'olControlNavToolbar'
    },
	
    /**
     * Method: draw 
     * calls the default draw, and then activates mouse defaults.
     */
    draw: function() {
        var div = OpenLayers.Control.Panel.prototype.draw.apply(this, arguments);
        this.defaultControl = this.controls[0];
        return div;
    }
});