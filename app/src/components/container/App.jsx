import React, { Component } from "react";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import Input from "@material-ui/core/Input";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import ConsoleContainer from "./ConsoleContainer.jsx";
import MapContainer from "./MapContainer.jsx";
import ListSubheader from "@material-ui/core/ListSubheader";
import WellKnownTextInput from "../presentational/WellKnownTextInput.jsx";
import CreditsDisplay from "../presentational/CreditsDisplay.jsx";
import SearchAndFilterInput from "../presentational/SearchAndFilterInput.jsx";
import AdapterDateFns from '@mui/lab/AdapterDateFns';
import LocalizationProvider from '@mui/lab/LocalizationProvider';
import parse_georaster from "georaster";
import GeoRasterLayer from "georaster-layer-for-leaflet";
import "proj4leaflet";

/**
 * Controls css styling for this component using js to css
 */
const useStyles = makeStyles(theme => ({
  appPaper: {
    display: "flex",
    flexDirection: "row"
  },
  rightSidebar: {
    border: `1px solid ${theme.palette.divider}`
  },
  container: {
    display: "flex",
    alignContent: "center",
    justifyContent: "space-between"
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 125
  },
  autoComplete: {}
}));

/**
 * App is the parent component for all of the other components in the project. It
 * imports and creates all of the map and console components and contains the
 * target selector.
 *
 * @component
 */
export default function App() {
  const classes = useStyles();
  const [targetPlanet, setTargetPlanet] = React.useState("Mercury");

  /**
   * Handles target selection
   *
   * @param {*} event selection event
   */
  const handleChange = event => {
    setTargetPlanet(event.target.value);
  };

  window.addEventListener("DOMContentLoaded", () => {
  var map = new L.map('geoTIFF-map').setView([0,0], 1, true);
  L.tileLayer('').addTo(map);

  var url_to_geotiff_file = "B02output.tif";
  var layer;
  var collection = {};
  fetch(url_to_geotiff_file)
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => {
      parse_georaster(arrayBuffer).then(georaster => {
        console.log("georaster:", georaster);
        layer = new GeoRasterLayer({
            georaster: georaster,
            debugLevel: 1
        })
        console.log(layer);
        collection["geoTIFF"] = layer;
        L.control.layers(null, collection).addTo(map);

      });
    });
  });

  return (
    <div>
        <div id="geoTIFF-map"/>
      </div>
  )
}
