import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../services/api';

const NearbyAlertsScreen = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchIncidents = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      const data = await api.getIncidents({ limit: 50 });
      const activeIncidents = data.filter(i => i.status !== 'RESOLVED');
      setIncidents(activeIncidents);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchIncidents(true);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'SOS': return 'alert';
      case 'CCTV': return 'cctv';
      case 'DISASTER': return 'weather-lightning';
      default: return 'alert';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'SOS': return '#D97706';
      case 'CCTV': return '#DC2626';
      case 'DISASTER': return '#2563EB';
      default: return '#64748B';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' };
      case 'HIGH': return { bg: '#FED7AA', text: '#9A3412', border: '#FDBA74' };
      case 'MEDIUM': return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
      case 'LOW': return { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' };
      default: return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderIncident = ({ item }) => {
    const severityStyle = getSeverityColor(item.severity);
    const typeColor = getTypeColor(item.type);

    return (
      <View style={styles.incidentCard}>
        <View style={styles.incidentHeader}>
          <View style={[styles.iconContainer, { backgroundColor: typeColor }]}>
            <Icon name={getTypeIcon(item.type)} size={28} color="#FFFFFF" />
          </View>
          <View style={styles.incidentInfo}>
            <View style={styles.incidentMeta}>
              <Text style={styles.incidentType}>{item.type}</Text>
              <View
                style={[
                  styles.severityBadge,
                  {
                    backgroundColor: severityStyle.bg,
                    borderColor: severityStyle.border,
                  },
                ]}
              >
                <Text style={[styles.severityText, { color: severityStyle.text }]}>
                  {item.severity}
                </Text>
              </View>
            </View>
            <Text style={styles.incidentDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <View style={styles.incidentDetails}>
              <View style={styles.detailRow}>
                <Icon name="map-marker" size={16} color="#64748B" />
                <Text style={styles.detailText} numberOfLines={1}>
                  {item.location.address || `${item.location.lat.toFixed(4)}, ${item.location.lng.toFixed(4)}`}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Icon name="clock-outline" size={16} color="#64748B" />
                <Text style={styles.detailText}>{formatDate(item.timestamp)}</Text>
              </View>
            </View>
            {item.status === 'ACCEPTED' && (
              <View style={styles.statusBanner}>
                <Icon name="check-circle" size={16} color="#059669" />
                <Text style={styles.statusText}>Response team dispatched</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading && incidents.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Loading alerts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statsCard}>
          <View style={styles.statsLeft}>
            <Text style={styles.statsLabel}>Active Alerts</Text>
            <Text style={styles.statsValue}>{incidents.length}</Text>
          </View>
          <View style={styles.statsIcon}>
            <Icon name="alert" size={32} color="#FFFFFF" />
          </View>
        </View>
      </View>

      {incidents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="shield-check" size={80} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No active alerts</Text>
          <Text style={styles.emptyText}>You're all safe for now!</Text>
        </View>
      ) : (
        <FlatList
          data={incidents}
          renderItem={renderIncident}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
  },
  statsLeft: {
    flex: 1,
  },
  statsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#DC2626',
  },
  statsIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  incidentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  incidentHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incidentInfo: {
    flex: 1,
  },
  incidentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  incidentType: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  incidentDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  incidentDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    color: '#64748B',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
  },
});

export default NearbyAlertsScreen;
