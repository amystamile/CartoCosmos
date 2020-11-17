import L from "leaflet";
import "leaflet-draw";
import Wkt from "wicket";
import "wicket/wicket-leaflet.js";
import "leaflet-draw-drag";
import centroid from "@turf/centroid";

/**
 * @class AstroDrawControl
 * @aka L.Control.AstroDrawControl
 * @extends L.Control
 * @classdesc
 * Class that extends from the class L.Control.Draw and handles the back-end when a user draws on the leaflet map.
 * Since this class inherits L.Control, it is added to the AstroMap in the same way as other controls, like the zoom control.
 *
 * @example
 *
 * // add a feature group to the map
 * let drawnItems = new L.FeatureGroup();
 * map.addLayer(drawnItems);
 *
 * // add draw control to map
 * let drawControl = new AstroDrawControl({
 *   edit: {
 *      featureGroup: drawnItems
 *   }
 * }).addTo(map);
 */
export default L.Control.AstroDrawControl = L.Control.Draw.extend({
  options: {
    draw: {
      circle: true,
      marker: false,
      circlemarker: {
        color: "red",
        fillColor: "red",
        radius: 5
      }
    },
    edit: true
  },

  /**
   * @function AstroDrawControl.prototype.onAdd
   * @description Adds the draw control to the map provided. Creates an on-draw and on-click event
   *              that allows users to draw polygons onto the leaflet map.
   * @param  {AstroMap} map - The AstroMap to add the control to.
   * @return {Object} The div-container the control is in.
   */
  onAdd: function(map) {
    // Update circlemarker tooltip to say point
    L.drawLocal.draw.toolbar.buttons.circlemarker = "Draw a point";

    this._map = map;
    this.wktTextBox = L.DomUtil.get("wktTextBox");
    this.wkt = new Wkt.Wkt();
    this.myLayer = L.Proj.geoJson().addTo(map);
    this.wktButton = L.DomUtil.get("wktButton");

    L.DomEvent.on(this.wktButton, "click", this.addShapeFromTextBox, this);

    map.on(
      "draw:created",
      function(e) {
        this.options.edit["featureGroup"].addLayer(e.layer);
        e.layer.on(
          "click",
          function(e) {
            this.updateWKT(e.target);
            // Easiest way to check type of shape,
            // since Circle inherits from CircleMarker,
            // check if not a Circle.
            if (
              e.target instanceof L.CircleMarker &&
              !(e.target instanceof L.Circle)
            ) {
              this.zoomOnShape(e.target, "Point");
            } else {
              this.zoomOnShape(e.target, "Polygon");
            }
          },
          this
        );

        this.updateWKT(e.layer);
      },
      this
    );
    map.on(
      "draw:edited",
      function(e) {
        let editedShape = e.layers._layers[Object.keys(e.layers._layers)[0]];
        if (editedShape != undefined) {
          this.updateWKT(editedShape);
        }
      },
      this
    );

    return L.Control.Draw.prototype.onAdd.call(this, map);
  },

  /**
   * @function AstroDrawControl.prototype.updateWKT
   * @description Updates the Well Known Text (WKT) box with the previously drawn shape.
   * @param  {L.Layer} shape - Leaflet layer describing the shape.
   */
  updateWKT: function(shape) {
    let geoJson = shape.toGeoJSON();

    geoJson = geoJson["geometry"];

    // GeoJSON does not support circles natively,
    // so approximate a circle with a polygon
    if (shape instanceof L.Circle) {
      geoJson = this.createGeoJSONCircle(
        geoJson["coordinates"],
        shape._mRadius,
        50
      );
    }

    this.wkt.read(JSON.stringify(geoJson));
    this.wktTextBox.value = this.wkt.write();
  },

  /**
   * @function AstroDrawControl.prototype.zoomOnShape
   * @description Zooms in on the shape depending on the type.
   * @param  {L.Layer} shape - Leaflet layer describing the shape.
   * @param  {String} type - Type of the shape.
   */
  zoomOnShape: function(feature, type) {
    if (type == "Point") {
      this._map.setView(feature.getLatLng(), this._map.options.maxZoom);
    } else {
      this._map.fitBounds(feature.getBounds().pad(0.3));
    }
  },

  /**
   * @function AstroDrawControl.prototype.addShapeFromTextBox
   * @description  Is called when a user clicks the draw button below the AstroMap.
   *               Will take the Well-Known text string and draw the shape onto the map.
   *               If the Well-Known text string is invalid an error will show in the text box.
   * @param  {DomEvent} e  - On Click of Well-Known text button.
   */
  addShapeFromTextBox: function(e) {
    let wktValue = this.wktTextBox.value;
    this.addShapeFromWKT(wktValue);
  },

  /**
   * @function AstroDrawControl.prototype.addShapeFromWKT
   * @description  Creates a feature GeoJSON from an input WKT and adds the feature to
   *               the map.
   * @param  {String} wktStr  - Well-known text string of geometry.
   */
  addShapeFromWKT: function(wktStr) {
    this.wktTextBox.value = wktStr;
    try {
      this.wkt.read(wktStr);
    } catch (err) {
      alert("Invalid Well Known Text String");
      return;
    }

    let feature = this.wkt.toObject();
    let geoJson = this.wkt.toJson();

    // Had some problems drawing points, so manually add
    // the circle marker.
    let drawControl = this;
    if (geoJson["type"] == "Point") {
      feature = L.circleMarker(
        [geoJson["coordinates"][1], geoJson["coordinates"][0]],
        drawControl.options.draw.circlemarker
      );
    }

    this.zoomOnShape(feature, geoJson["type"]);
    this.options.edit["featureGroup"].addLayer(feature);

    feature.on(
      "click",
      function() {
        this.updateWKT(feature);
        this.zoomOnShape(feature, geoJson["type"]);
      },
      this
    );

    // let centroidGeoJSON = centroid(geoJson);
    // this._map.panTo(
    //   centroidGeoJSON.geometry.coordinates[1],
    //   centroidGeoJSON.geometry.coordinates[0]
    // );
  },

  /**
   * @function AstroDrawControl.prototype.createGeoJSONCircle
   * @description  Approximates a circle with a GeoJSON polygon.
   * @param  {Array} center     - Center of the circle.
   * @param  {Float} radius     - Radius of the circle in meters.
   * @param  {Integer} points   - Number of points to fill the
   *                             polygon with.
   */
  createGeoJSONCircle: function(center, radius, points) {
    if (!points) points = 64;

    let coords = {
      latitude: center[1],
      longitude: center[0]
    };

    let km = radius / 1000.0;

    let ret = [];
    let distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
    let distanceY = km / 110.574;

    let theta, x, y;
    for (let i = 0; i < points; i++) {
      theta = (i / points) * (2 * Math.PI);
      x = distanceX * Math.cos(theta);
      y = distanceY * Math.sin(theta);

      ret.push([coords.longitude + x, coords.latitude + y]);
    }
    ret.push(ret[0]);

    return {
      type: "Polygon",
      coordinates: [ret]
    };
  }
});
