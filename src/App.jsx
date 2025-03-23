import {
  GeolocateControl,
  Layer,
  Map,
  Marker,
  NavigationControl,
  Source,
} from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css"; // See notes below
import "./App.css";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import _ from "lodash";

const App = () => {
  const [routeData, setRouteData] = useState(null);
  const [startCoordinate, setStartCoordinate] = useState(null);
  const [endCoordinate, setEndCoordinate] = useState(null);
  const [type, setType] = useState(null);
  const [turnByTurnInstructions, setTurnByTurnInstructions] = useState([]);
  const [profile, setProfile] = useState("driving-car");
  const [userLocation, setUserLocation] = useState(null);
  const [disDur, setDisDur] = useState({
    distance: 0,
    duration: 0,
  });
  const [liveRouting, setLiveRouting] = useState(false);

  useEffect(() => {
    let watchId;
    if (navigator.geolocation && liveRouting) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          setUserLocation([longitude, latitude]);
        },
        (error) => {
          console.log(error.message, "😁");
        },
        {
          enableHighAccuracy: true,
          timeout: 60000,
          maximumAge: 3000,
        }
      );
    } else {
      console.log("Geolocation is not supported by this browser");
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [liveRouting]);
  const getRouteThrottled = useCallback(
    _.throttle(async () => {
      const apiKey = "5b3ce3597851110001cf62487bd10ff850434c58ac7c2d99a5bf9ed1";
      const url = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;

      const body = {
        coordinates: [
          liveRouting ? userLocation : startCoordinate,
          endCoordinate,
        ],
      };
      try {
        const response = await axios.post(url, body, {
          headers: {
            Authorization: apiKey,
            "Content-Type": "application/json",
          },
        });
        let route = response.data;
        console.log(route);

        const { distance, duration } = route.features[0].properties.segments[0];
        setRouteData(route);
        setDisDur({ distance, duration });
        const instructions = route.features[0].properties.segments[0].steps.map(
          (step) => step.instruction
        );
        setTurnByTurnInstructions(instructions);
      } catch (error) {
        console.log("error", "🔥");
        console.log(error.message, "👌");
      }
    }, 5200),
    [userLocation, startCoordinate, endCoordinate, liveRouting, profile]
  );
  useEffect(() => {
    if (startCoordinate && endCoordinate) {
      getRouteThrottled();
    }
    if (liveRouting && userLocation && endCoordinate) {
      getRouteThrottled();
    }
  }, [
    endCoordinate,
    startCoordinate,
    profile,
    userLocation,
    liveRouting,
    getRouteThrottled,
  ]);

  const handleMapClick = (e) => {
    const clickedLngLat = e.lngLat;
    if (!liveRouting) {
      if (!type) {
        setStartCoordinate([clickedLngLat.lng, clickedLngLat.lat]);
        setType("start");
      } else if (type === "start") {
        setEndCoordinate([clickedLngLat.lng, clickedLngLat.lat]);
        setType("end");
      }
    } else if (liveRouting) {
      setEndCoordinate([clickedLngLat.lng, clickedLngLat.lat]);
    }
  };
  let formatTime = (tsec) => {
    let hours = Math.floor(tsec / 3600);
    let minutes = Math.floor((tsec - hours * 3600) / 60);
    let seconds = Math.floor(tsec - hours * 3600 - minutes * 60);

    return `${hours.toString(10).padStart(2, "0")}hrs ${minutes
      .toString(10)
      .padStart(2, "0")}min ${seconds.toString(10).padStart(2, "0")}sec`;
  };
  let toggleLiveRouting = () => {
    setStartCoordinate(null);
    setEndCoordinate(null);
    setRouteData(null);
    setType(null);
    setTurnByTurnInstructions([]);
    setLiveRouting((prev) => !prev);
    setDisDur({
      distance: 0,
      duration: 0,
    });
  };

  return (
    <div className="app">
      <Map
        id="mainMap"
        initialViewState={{
          longitude: 79.1205,
          latitude: 12.8802,
          zoom: 15,
        }}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        onClick={handleMapClick}
      >
        <GeolocateControl
          positionOptions={{
            enableHighAccuracy: true,
            timeout: 60000,
          }}
          position="top-left"
          showAccuracyCircle={false}
          showUserLocation={false}
          trackUserLocation={true}
        />
        <NavigationControl showCompass={true} />
        {routeData && (
          <Source id="route" type="geojson" data={routeData}>
            <Layer
              id="route-line"
              type="line"
              paint={{
                "line-color": "#000000",
                "line-width": 5,
                "line-dasharray":
                  profile === "foot-walking" ? [0.2, 0.2] : [1, 0],
              }}
            />
          </Source>
        )}
        {startCoordinate && (
          <Marker
            longitude={startCoordinate[0]}
            latitude={startCoordinate[1]}
            anchor="bottom"
            draggable
            onDragEnd={(e) => {
              setStartCoordinate([e.lngLat.lng, e.lngLat.lat]);
            }}
          >
            <img
              src="/images/greenMark.png"
              alt="greenMarker"
              style={{
                width: "30px",
                height: "30px",
                objectFit: "contain",
                objectPosition: "center",
              }}
            />
          </Marker>
        )}
        {endCoordinate && (
          <Marker
            longitude={endCoordinate[0]}
            latitude={endCoordinate[1]}
            anchor="bottom"
            draggable
            onDragEnd={(e) => {
              setEndCoordinate([e.lngLat.lng, e.lngLat.lat]);
            }}
          >
            <img
              src="/images/redMark.png"
              alt="redMarker"
              style={{
                width: "30px",
                height: "30px",
                objectFit: "contain",
                objectPosition: "center",
              }}
            />
          </Marker>
        )}
        {userLocation && userLocation?.length === 2 && liveRouting && (
          <Marker
            longitude={userLocation?.[0]}
            latitude={userLocation?.[1]}
            anchor="bottom"
          >
            <div
              style={{
                backgroundColor: "blue",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                border: "3px solid white",
              }}
            />
          </Marker>
        )}
      </Map>
      <div className="instructions">
        <h2>Instructions</h2>

        <p>Click on the map to select the starting and ending points.</p>
        {disDur.distance !== 0 && <p>Distance: {disDur.distance} meters</p>}
        {disDur.duration !== 0 && (
          <p>Duration: {formatTime(disDur.duration)}</p>
        )}
        <ul>
          {turnByTurnInstructions.length > 0 &&
            turnByTurnInstructions.map((instruction, index) => (
              <li key={index}>{instruction}</li>
            ))}
        </ul>
      </div>
      <select
        id="selectOptions"
        value={profile}
        onChange={(e) => setProfile(e.target.value)}
      >
        <option value="driving-car">🚗 Car</option>
        <option value="cycling-regular">🚴 Regular Bike</option>
        <option value="cycling-electric">⚡ Electric Bike</option>
        <option value="foot-walking">🚶 Walking</option>
      </select>
      <button id="liveRButt" onClick={toggleLiveRouting}>
        {liveRouting ? "Stop Live Routing" : "Start Live Routing"}
      </button>
    </div>
  );
};

export default App;
