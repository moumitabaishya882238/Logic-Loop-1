import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import WebView from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../services/api';
import { getCurrentLocation, requestLocationPermission } from '../utils/location';

const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { padding: 0; margin: 0; background-color: #0F172A; }
    html, body, #map { height: 100%; width: 100%; }
    /* Dark Theme Map Tiles Setup */
    .leaflet-layer,
    .leaflet-control-zoom-in,
    .leaflet-control-zoom-out,
    .leaflet-control-attribution {
      filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
    }

    .custom-marker {
      background: transparent;
      border: none;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([26.1445, 91.7362], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    var markersLayer = L.layerGroup().addTo(map);
    var userMarker = null;

    function getMarkerColor(type) {
      if (type === 'CCTV') return '#DC2626';
      if (type === 'SOS') return '#D97706';
      if (type === 'DISASTER') return '#2563EB';
      return '#059669';
    }

    function createCustomIcon(color, isUser) {
      const svg = isUser 
        ? '<svg viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3" fill="#059669"></circle></svg>'
        : '<svg viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';

      return L.divIcon({
        className: 'custom-marker',
        html: \`<div style="background: \${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">\${svg}</div>\`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
    }

    function updateMapData(data) {
      try {
        const parsed = JSON.parse(data);
        
        // Handle User Location
        if (parsed.userLocation) {
          if (userMarker) {
             userMarker.setLatLng([parsed.userLocation.lat, parsed.userLocation.lng]);
          } else {
             userMarker = L.marker([parsed.userLocation.lat, parsed.userLocation.lng], {
               icon: createCustomIcon('#059669', true)
             }).addTo(map);
             map.setView([parsed.userLocation.lat, parsed.userLocation.lng], 14);
          }
        }

        // Handle Incidents
        if (parsed.incidents) {
          markersLayer.clearLayers();
          
          parsed.incidents.forEach(incident => {
            if (!incident.location || !incident.location.lat || !incident.location.lng) return;
            
            const color = getMarkerColor(incident.type);
            const marker = L.marker([incident.location.lat, incident.location.lng], {
              icon: createCustomIcon(color, false)
            }).addTo(markersLayer);

            if (incident.severity === 'CRITICAL') {
              L.circle([incident.location.lat, incident.location.lng], {
                color: color,
                fillColor: color,
                fillOpacity: 0.1,
                radius: 200,
                weight: 2
              }).addTo(markersLayer);
            }
          });
        }
      } catch (e) {
        console.error("Map Update Error: ", e);
      }
    }
  </script>
</body>
</html>
`;

const SafetyMapScreen = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const webViewRef = useRef(null);

  useEffect(() => {
    initializeMap();
    const interval = setInterval(fetchIncidents, 5000);
    return () => clearInterval(interval);
  }, []);

  const initializeMap = async () => {
    try {
      const hasPermission = await requestLocationPermission();
      if (hasPermission) {
        const location = await getCurrentLocation();
        setUserLocation(location);
        updateWebView({ userLocation: location });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
    fetchIncidents();
  };

  const fetchIncidents = async () => {
    try {
      const data = await api.getIncidents({ limit: 100 });
      const activeIncidents = data.filter(i => i.status !== 'RESOLVED');
      setIncidents(activeIncidents);
      setLoading(false);
      updateWebView({ incidents: activeIncidents });
    } catch (error) {
      console.error('Error fetching incidents:', error);
      setLoading(false);
    }
  };

  const updateWebView = (data) => {
    if (webViewRef.current) {
      const script = `updateMapData('${JSON.stringify(data).replace(/'/g, "\\'")}'); true;`;
      webViewRef.current.injectJavaScript(script);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="shield-check" size={32} color="#059669" />
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Safety Map</Text>
            <Text style={styles.headerSubtitle}>Live incident tracking</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.alertLabel}>Active Alerts</Text>
          <Text style={styles.alertCount}>{incidents.length}</Text>
        </View>
      </View>

      <WebView
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={styles.map}
        scrollEnabled={false}
        onLoadEnd={() => {
           updateWebView({ userLocation, incidents });
        }}
      />

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#059669' }]} />
          <Text style={styles.legendText}>You</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
          <Text style={styles.legendText}>CCTV</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#D97706' }]} />
          <Text style={styles.legendText}>SOS</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
          <Text style={styles.legendText}>Disaster</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Slate-900 Main background
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A', // Slate-900 Main background
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#94A3B8', // Slate-400
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B', // Slate-800 Header Area
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155', // Slate-700
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerInfo: {
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9', // Slate-100 Text
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8', // Slate-400
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  alertLabel: {
    fontSize: 12,
    color: '#94A3B8', // Slate-400
  },
  alertCount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#DC2626',
  },
  map: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#1E293B', // Slate-800 Legend Area
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155', // Slate-700
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#94A3B8', // Slate-400
  },
});

export default SafetyMapScreen;
