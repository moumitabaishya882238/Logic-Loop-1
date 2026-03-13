import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../services/api';
import { getCurrentLocation, requestLocationPermission } from '../utils/location';

const SafetyMapScreen = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [region, setRegion] = useState({
    latitude: 26.1445,
    longitude: 91.7362,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

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
        setRegion({
          latitude: location.lat,
          longitude: location.lng,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });
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
    } catch (error) {
      console.error('Error fetching incidents:', error);
      setLoading(false);
    }
  };

  const getMarkerColor = (type) => {
    switch (type) {
      case 'CCTV': return '#DC2626';
      case 'SOS': return '#D97706';
      case 'DISASTER': return '#2563EB';
      default: return '#059669';
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

      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.lat,
              longitude: userLocation.lng,
            }}
            title="Your Location"
            pinColor="#059669"
          />
        )}

        {incidents.map((incident) => (
          <React.Fragment key={incident.id}>
            <Marker
              coordinate={{
                latitude: incident.location.lat,
                longitude: incident.location.lng,
              }}
              pinColor={getMarkerColor(incident.type)}
              title={incident.type}
              description={incident.description}
            />
            {incident.severity === 'CRITICAL' && (
              <Circle
                center={{
                  latitude: incident.location.lat,
                  longitude: incident.location.lng,
                }}
                radius={150}
                fillColor={`${getMarkerColor(incident.type)}20`}
                strokeColor={getMarkerColor(incident.type)}
                strokeWidth={1}
              />
            )}
          </React.Fragment>
        ))}
      </MapView>

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
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  alertLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  alertCount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#DC2626',
  },
  map: {
    flex: 1,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
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
    color: '#64748B',
  },
});

export default SafetyMapScreen;
