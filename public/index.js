
var panosUrl;
var panoImagePrefix;
var panoImageSuffix;
var closestPanosData;
var allPanosData;
var mapCenterLatLng;
var panorama;
var map;
var panos;
var currLatLng;
var panoPolyLines;
var panoColors;
var marker;
var acceptedTrees;
var acceptedTreeMarkers;
var infoWindow;
var cancelTreeWindow;

function initialize() {
    var urlParams = getJsonFromUrl();
    var lat = parseFloat(urlParams.lat);
    var lng = parseFloat(urlParams.lng);
    var panoImageRegion = urlParams.region;
    
    panosUrl = '/panodata';
    panoImagePrefix = 'http://131.215.134.227/los_angeles/streetview/' + panoImageRegion + '/';
    panoImageSuffix = '_z2.jpg';
    mapCenterLatLng = new google.maps.LatLng(lat, lng);
    currLatLng = mapCenterLatLng;
    panos = [];
    panoPolyLines = [];
    cancelTreeWindow = new google.maps.InfoWindow({
            content: ''
        });
    infoWindow = new google.maps.InfoWindow({
            content: ''
        });
    panoColors = ['#FF8282', '#C1FF82', '#82FFFF', '#C182FF'];
    panoDivs = [
        document.getElementById('pano_1'),
        document.getElementById('pano_2'),
        document.getElementById('pano_3'),
        document.getElementById('pano_4')
    ];
    for (var i = 0; i < panoDivs.length; i++) {
        panoDivs[i].style.border = '3px solid' + panoColors[i];
    }
    acceptedTrees = [];
    acceptedTreeMarkers = [];
    initializeMap();
    initializePanos();
}

function getPanoImgSrc(pano, zoom, tileX, tileY) {
    var panoramaImageSrc = panoImagePrefix+closestPanosData[parseInt(pano)].Location.panoId+panoImageSuffix;
    return panoramaImageSrc;
}

// Construct StreetViewPanoramaData for the given pano.
function getPanorama(pano, zoom, tileX, tileY) {
    return {
      location: {
        pano: pano,
        description: 'pano',
      },
      links: [],
      // The text for the copyright control.
      copyright: 'Imagery (c) 2010 Google',
      // The definition of the tiles for this panorama.
      tiles: {
        tileSize: new google.maps.Size(512, 512),
        worldSize: new google.maps.Size(512, 512),
        centerHeading: closestPanosData[parseInt(pano)].Projection.pano_yaw_deg,
        getTileUrl: getPanoImgSrc
      }
    };
}

function initializePanos() {
    // Load panos json
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', panosUrl, true); 
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            allPanosData = JSON.parse(xobj.responseText);
            for(var i in allPanosData) {
                allPanosData[i].lat = parseFloat(allPanosData[i]['Location']['original_lat']);
                allPanosData[i].lng = parseFloat(allPanosData[i]['Location']['original_lng']);
            }
            updatePanos();
        }
      };
      xobj.send(null); 
}

function updatePanos() {
    closestPanosData = getNearestPanos(currLatLng.lat(), currLatLng.lng(), 4);
    panos = [];
    for (var i = 0; i < panoPolyLines.length; i++) {
        panoPolyLines[i].setMap(null);
    }
    panoPolyLines = [];
    
    for (var i = 0; i < closestPanosData.length; i++) {
        panorama = new google.maps.StreetViewPanorama(
            panoDivs[i], {
            pano: i.toString(),
            visible: true,
            panoProvider: getPanorama,
            disableDefaultUI: true,
            map: map
        });
        panorama.setZoom(1);
        var panoLatLng = new google.maps.LatLng(closestPanosData[i].lat, 
                                                closestPanosData[i].lng);
        
        var polyLine = new google.maps.Polyline({
            path: [panoLatLng, currLatLng],
            geodesic: true,
            strokeColor: panoColors[i],
            strokeOpacity: 1.0,
            strokeWeight: 2,
            map: map
        });
        panoPolyLines.push(polyLine);
        var heading = google.maps.geometry.spherical.computeHeading(
            panoLatLng, currLatLng);
        //panorama.setPosition(panoLatLng);
        panorama.setPov({heading: heading,
                         pitch: 0});
        panos.push(panorama);
    }
}

function initializeMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: mapCenterLatLng,
        zoom: 18,
        mapTypeId: google.maps.MapTypeId.HYBRID,
        disableDefaultUI: true,
        //draggable: false,
        //scrollwheel: false
    });
    var windowContent = "<button id='accept_tree_button' onclick='acceptTree();'>Add Tree</button>";
    infoWindow.close();
    infoWindow = new google.maps.InfoWindow({
        content: windowContent,
        disableAutoPan: true
    });
    marker = new google.maps.Marker({
       position: currLatLng,
       map: map,
       title: 'tree'
    });
    map.addListener('click', function(event) {
        currLatLng = event.latLng;
        updatePanos();
        marker.setMap(null);
        var markerOptions = {
           position: event.latLng,
           map: map,
           title: 'tree',
           draggable: true
        };
        marker = new google.maps.Marker(markerOptions);
        marker.addListener('drag', function(event) {
            currLatLng = event.latLng;
            panPanos(event.latLng);
        });
        marker.addListener('dragend', function(event) {
            infoWindow.open(map, marker);
        })
        infoWindow.open(map, marker);
    });
}

function panPanos(newLatLng) {
    currLatLng = newLatLng;
    for (var i = 0; i < panos.length; i++) {
        var panoLatLng = new google.maps.LatLng(closestPanosData[i].lat, 
                                                closestPanosData[i].lng);
        var heading = google.maps.geometry.spherical.computeHeading(
            panoLatLng, currLatLng);
        panos[i].setPov({heading: heading,
                         pitch: 0});
        panoPolyLines[i].setPath([panoLatLng, currLatLng])
    }
}

function getNearestPanos(lat, lng, num_panos) {
    var dists = [], retval = [];
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
        retval.push(dists[i].pano);
    return retval;
}

function acceptTree() {
    infoWindow.close();
    var acceptedTreeMarker = new google.maps.Marker({
           position: marker.getPosition(),
           map: map,
           title: 'tree',
           draggable: false,
           icon: 'tree-icon.png'
    });
    acceptedTreeMarker.addListener('click', function(event) {
        var windowContent = "<button id='remove_tree_button'>Remove</button>";
        cancelTreeWindow.close();
        cancelTreeWindow = new google.maps.InfoWindow({
            content: windowContent,
            disableAutoPan: true
        });
        cancelTreeWindow.open(map, acceptedTreeMarker);
        $('#remove_tree_button').click(function() {
            var index = acceptedTreeMarkers.indexOf(acceptedTreeMarker);
            acceptedTreeMarkers.splice(index, 1);
            acceptedTrees.splice(index, 1);
            acceptedTreeMarker.setMap(null);
            cancelTreeWindow.close();
        });
    });
    acceptedTreeMarkers.push(acceptedTreeMarker);
    acceptedTrees.push({
        lat: marker.getPosition().lat(),
        lng: marker.getPosition().lng(),
    });
    marker.setMap(null);
}

function submitAllTrees() {
    for (var i = 0; i < acceptedTrees.length; i++) {
        console.log("submitting tree at " + acceptedTrees[i].lat + ", " + acceptedTrees[i].lng);
    }
}

function getJsonFromUrl() {
  var query = location.search.substr(1);
  var result = {};
  query.split("&").forEach(function(part) {
    var item = part.split("=");
    result[item[0]] = decodeURIComponent(item[1]);
  });
  return result;
}
