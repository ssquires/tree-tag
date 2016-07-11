
var closestPanosData;
var allPanosData;

var panorama;
var map;

var currPano;
var currLatLng;
var currPolyLine;
var currTreeMarker;

var acceptedTreeMarkers = [];
var treeNumber;
var panoImageRegion;


/*
 *  Initial setup.
 */
function initialize() {
    var urlParams = getJsonFromUrl();
    var lat = parseFloat(urlParams.lat);
    var lng = parseFloat(urlParams.lng);
    panoImageRegion = urlParams.region;
    
    currLatLng = new google.maps.LatLng(lat, lng);
    initializeMap(currLatLng);
    initializePano(panoImageRegion);
    
    $("#directions_button").click(function() {
        if ($(this).html() == "<h3>Directions (hide)</h3>") {
            $(this).html("<h3>Directions (show)</h3>");
        } else {
            $(this).html("<h3>Directions (hide)</h3>");
        }
        $("#directions_box").slideToggle();
    });
}


/*
 *  Initializes the map.
 */
function initializeMap(latLng) {
    map = new google.maps.Map(document.getElementById("map"), {
        center: latLng,
        zoom: 20,
        tilt: 0,
        mapTypeId: google.maps.MapTypeId.HYBRID,
        disableDefaultUI: true,
        draggable: false,
        scrollwheel: false
    });
    map.addListener("click", function(event) {
        currLatLng = event.latLng;
        updatePano();
        addTree(event.latLng);
    });
}


/*
 *  Returns the url of the appropriate pano image.
 */
function getPanoImgSrc(pano, zoom, tileX, tileY) {
    var panoImagePrefix = "http://sbranson.no-ip.org/pasadena_panos/" + panoImageRegion + "/";
    var panoImageSuffix = "_z2.jpg";
    var panoramaImageSrc = panoImagePrefix + closestPanosData[0].Location.panoId + panoImageSuffix;
    return panoramaImageSrc;
}


/*
 *  Builds a Street View panorama.
 */
function getPanorama(pano, zoom, tileX, tileY) {
    return {
      location: {
        pano: pano,
        description: "pano",
      },
      links: [],
      // The text for the copyright control.
      copyright: "Imagery (c) 2010 Google",
      // The definition of the tiles for this panorama.
      tiles: {
        tileSize: new google.maps.Size(512, 512),
        worldSize: new google.maps.Size(512, 512),
        centerHeading: closestPanosData[parseInt(pano)].Projection.pano_yaw_deg,
        getTileUrl: getPanoImgSrc
      }
    };
}


/*
 *  Loads all panorama data for the given region.
 */
function initializePano(panoImageRegion) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open("GET", "/panodata/" + "?region=" + panoImageRegion, true); 
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            allPanosData = JSON.parse(xobj.responseText);
            for(var i in allPanosData) {
                allPanosData[i].lat = parseFloat(allPanosData[i]["Location"]["original_lat"]);
                allPanosData[i].lng = parseFloat(allPanosData[i]["Location"]["original_lng"]);
            }
            updatePano();
        }
      };
    xobj.send(null); 
}


/*
 *  Updates the panorama displayed with the pano image closest to the given coordinates.
 */
function updatePano() {
    closestPanosData = getNearestPanos(currLatLng.lat(), currLatLng.lng(), 1);
    currPano = new google.maps.StreetViewPanorama(document.getElementById("pano_1"), {
        pano: "0",
        visible: true,
        panoProvider: getPanorama,
        disableDefaultUI: true,
        map: map,
        zoom: 1
    });
    
    var panoLatLng = new google.maps.LatLng(closestPanosData[0].lat, 
                                            closestPanosData[0].lng);
    var heading = google.maps.geometry.spherical.computeHeading(
            panoLatLng, currLatLng);
    
    currPano.setPov({heading: heading,
                     pitch: 0});
    
    updatePolyline(panoLatLng.lat(), panoLatLng.lng(), currLatLng.lat(), currLatLng.lng());
}


/*
 *  Displays a polyline on the map from the panorama's position to the current point's position.
 */
function updatePolyline(panoLat, panoLng, pointLat, pointLng) {
    if (currPolyLine) {
        currPolyLine.setMap(null);
    }
    currPolyLine = new google.maps.Polyline({
        path: [{lat: panoLat, lng: panoLng}, {lat: pointLat, lng: pointLng}],
        geodesic: true,
        strokeColor: "#FF0000",
        strokeOpacity: 1.0,
        strokeWeight: 2,
        map: map
    });
}


/*
 *  Adds a tree marker to the map and keeps track of the new tree's coordinates.
 */
function addTree(latLng) {
    currTreeMarker = new google.maps.Marker({
           position: latLng,
           map: map,
           title: "tree",
           draggable: true,
           icon: "tree-icon.png"
    });
    acceptedTreeMarkers.push(currTreeMarker);
    var acceptedTreeMarker = currTreeMarker;
    acceptedTreeMarker.addListener("click", function(event) {
        var index = acceptedTreeMarkers.indexOf(acceptedTreeMarker);
        acceptedTreeMarkers.splice(index, 1);
        acceptedTreeMarker.setMap(null);
    });
    acceptedTreeMarker.addListener("drag", function(event) {
        currLatLng = event.latLng;
        panPanos(event.latLng);
        var index = acceptedTreeMarkers.indexOf(acceptedTreeMarker);
    });
}


/*
 *  Saves annotated tree coordinates in (lat, lng) pairs as a CSV
 */
function saveTreesToCSV() {
    allTreeCoords = [];
    for (var marker in acceptedTreeMarkers) {
        allTreeCoords[marker] = acceptedTreeMarkers[marker].getPosition();
    }
    
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open("POST", "/savetrees");
    xobj.setRequestHeader("Content-Type", "application/json");
    xobj.send(JSON.stringify(allTreeCoords));
}


/*
 *  Pans panorama image to "look at" given coordinates.
 */
function panPanos(newLatLng) {
    currLatLng = newLatLng;
    var panoLatLng = new google.maps.LatLng(closestPanosData[0].lat, 
                                            closestPanosData[0].lng);
    var heading = google.maps.geometry.spherical.computeHeading(
        panoLatLng, currLatLng);
    currPano.setPov({heading: heading,
                     pitch: 0});
    currPolyLine.setPath([panoLatLng, currLatLng])
}


/*
 *  Returns the n nearest panos in the loaded dataset to the given coordinates.
 */
function getNearestPanos(lat, lng, num_panos) {
    var dists = [], closestPanos = [];
    for(var i in allPanosData) {
        var panoLatLng = new google.maps.LatLng(allPanosData[i].lat, 
                                                    allPanosData[i].lng);
        var distance = google.maps.geometry.spherical.computeDistanceBetween(panoLatLng, currLatLng);
        dists.push({'dist': distance, 'pano':allPanosData[i]})
    }
    dists.sort(function(a, b) {
        return a.dist - b.dist;
    });
    for(var i = 0; i < dists.length && i < num_panos; i++) 
        closestPanos.push(dists[i].pano);
    return closestPanos;
}


/*
 *  Parses the URL params into JSON.
 */
function getJsonFromUrl() {
  var query = location.search.substr(1);
  var result = {};
  query.split("&").forEach(function(part) {
    var item = part.split("=");
    result[item[0]] = decodeURIComponent(item[1]);
  });
  return result;
}