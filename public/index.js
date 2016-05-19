
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
var acceptedTreeMarkers;
var acceptedTreeInputs;
var panoImageRegion;
var treeNumber;

function initialize() {
    var urlParams = getJsonFromUrl();
    var lat = parseFloat(urlParams.lat);
    var lng = parseFloat(urlParams.lng);
    var assignmentId = urlParams.assignmentId;
    console.log(assignmentId);
    $('#assignment_id').val(assignmentId);
    
    panoImageRegion = urlParams.region;
    
    panosUrl = '/panodata';
    panoImagePrefix = 'http://131.215.134.227/los_angeles/streetview/' + panoImageRegion + '/';
    panoImageSuffix = '_z2.jpg';
    mapCenterLatLng = new google.maps.LatLng(lat, lng);
    currLatLng = mapCenterLatLng;
    panos = [];
    panoPolyLines = [];
    panoColors = ['#FF8282'];
    panoDivs = [
        document.getElementById('pano_1')
    ];
    for (var i = 0; i < panoDivs.length; i++) {
        panoDivs[i].style.border = '3px solid' + panoColors[i];
    }
    
    $("#directions_button").click(function() {
        if ($(this).html() == "<h3>Directions (hide)</h3>") {
            $(this).html("<h3>Directions (show)</h3>");
        } else {
            $(this).html("<h3>Directions (hide)</h3>");
        }
        $("#directions_box").slideToggle();
    });
    
    acceptedTreeMarkers = [];
    acceptedTreeInputs = [];
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
    xobj.open('GET', panosUrl + '/' + '?region=' + panoImageRegion, true); 
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
    closestPanosData = getNearestPanos(currLatLng.lat(), currLatLng.lng(), 1);
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
        panorama.setPov({heading: heading,
                         pitch: 0});
        panos.push(panorama);
    }
}

function initializeMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: mapCenterLatLng,
        zoom: 20,
        tilt: 0,
        mapTypeId: google.maps.MapTypeId.HYBRID,
        disableDefaultUI: true,
        draggable: false,
        scrollwheel: false
    });
    map.addListener('click', function(event) {
        currLatLng = event.latLng;
        updatePanos();
        addTree(event.latLng);
    });
}

function addTree(latLng) {
    marker = new google.maps.Marker({
           position: latLng,
           map: map,
           title: 'tree',
           draggable: false,
           icon: 'tree-icon.png'
    });
    acceptedTreeMarkers.push(marker);
    var acceptedTreeMarker = marker;
    acceptedTreeMarker.addListener('click', function(event) {
        var index = acceptedTreeMarkers.indexOf(acceptedTreeMarker);
        acceptedTreeMarkers.splice(index, 1);
        acceptedTreeInputs[index].remove();
        acceptedTreeInputs.splice(index, 1);
        acceptedTreeMarker.setMap(null);
    });
    acceptedTreeMarker.addListener('drag', function(event) {
        currLatLng = event.latLng;
        panPanos(event.latLng);
        var index = acceptedTreeMarkers.indexOf(acceptedTreeMarker);
        
    });
    var input = $('<input>').attr({
        type: 'hidden',
        name: 'trees[]',
        id: treeNumber,
        value: latLng.lat() + ',' + latLng.lng()
    });
    input.appendTo('#form');
    acceptedTreeInputs.push(input);
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

function getJsonFromUrl() {
  var query = location.search.substr(1);
  var result = {};
  query.split("&").forEach(function(part) {
    var item = part.split("=");
    result[item[0]] = decodeURIComponent(item[1]);
  });
  return result;
}

