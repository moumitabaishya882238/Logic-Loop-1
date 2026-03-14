import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../services/api';
import { getCurrentLocation, requestLocationPermission } from '../utils/location';

const ReportIncidentScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    severity: 'MEDIUM',
    type: 'SOS',
  });

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Location permission is required');
        setLoading(false);
        return;
      }

      const location = await getCurrentLocation();

      const incidentData = {
        type: formData.type,
        location: {
          lat: location.lat,
          lng: location.lng,
          address: `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}`,
        },
        description: formData.description,
        severity: formData.severity,
        reportedBy: formData.name,
      };

      await api.createSOSIncident(incidentData);
      Alert.alert('Success', 'Incident reported successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Home') },
      ]);
      setFormData({ name: '', description: '', severity: 'MEDIUM', type: 'SOS' });
    } catch (error) {
      console.error('Error reporting incident:', error);
      Alert.alert('Error', 'Failed to report incident. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Icon name="file-document" size={48} color="#2563EB" />
        <Text style={styles.headerTitle}>Report Incident</Text>
        <Text style={styles.headerSubtitle}>Help us keep the community safe</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Your Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
        />

        <Text style={styles.label}>Incident Type *</Text>
        <View style={styles.typeContainer}>
          {['SOS', 'DISASTER'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeButton,
                formData.type === type && styles.typeButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, type })}
            >
              <Text
                style={[
                  styles.typeText,
                  formData.type === type && styles.typeTextActive,
                ]}
              >
                {type === 'SOS' ? 'Emergency / SOS' : 'Natural Disaster'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe what happened in detail..."
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          multiline
          numberOfLines={6}
        />

        <Text style={styles.label}>Severity Level *</Text>
        <View style={styles.severityContainer}>
          {[
            { value: 'LOW', label: 'Low' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'HIGH', label: 'High' },
            { value: 'CRITICAL', label: 'Critical' },
          ].map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.severityButton,
                formData.severity === item.value && styles.severityButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, severity: item.value })}
            >
              <Text
                style={[
                  styles.severityText,
                  formData.severity === item.value && styles.severityTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Icon name="map-marker" size={24} color="#2563EB" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Location Auto-Capture</Text>
            <Text style={styles.infoText}>
              Your current location will be automatically attached to the report
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Report</Text>
          )}
        </TouchableOpacity>

        <View style={styles.warningBox}>
          <Icon name="alert" size={24} color="#DC2626" />
          <View style={styles.infoContent}>
            <Text style={styles.warningTitle}>For Immediate Emergencies</Text>
            <Text style={styles.warningText}>
              If you're in immediate danger, please call emergency services or use the SOS button
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Slate-900 Main background
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#1E293B', // Slate-800 Header Area
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F1F5F9', // Slate-100 Text
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8', // Slate-400 Text
    marginTop: 8,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9', // Slate-100 Text
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#334155', // Slate-700 Border
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#F1F5F9', // Slate-100 Text
    backgroundColor: '#1E293B', // Slate-800 Card
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  typeContainer: {
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155', // Slate-700
    backgroundColor: '#1E293B', // Slate-800
  },
  typeButtonActive: {
    backgroundColor: '#2563EB', // Blue-600
    borderColor: '#2563EB',
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8', // Slate-400
  },
  typeTextActive: {
    color: '#FFFFFF',
  },
  severityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  severityButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155', // Slate-700
    backgroundColor: '#1E293B', // Slate-800
  },
  severityButtonActive: {
    backgroundColor: '#DC2626', // Red-600
    borderColor: '#DC2626',
  },
  severityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8', // Slate-400
  },
  severityTextActive: {
    color: '#FFFFFF',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#172554', // Blue-950 Dark Info Box
    borderWidth: 1,
    borderColor: '#1E3A8A', // Blue-900 border
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#93C5FD', // Blue-300 Light Header
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#60A5FA', // Blue-400 Info Text
  },
  submitButton: {
    backgroundColor: '#059669', // Emerald/Gov theme active green
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#450A0A', // Red-950 Dark Red Warning Box
    borderWidth: 1,
    borderColor: '#7F1D1D', // Red-900 border
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FCA5A5', // Red-300 Light Header
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#F87171', // Red-400 Text
  },
});

export default ReportIncidentScreen;
