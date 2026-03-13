import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../services/api';
import { getCurrentLocation, requestLocationPermission } from '../utils/location';

const HomeScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    severity: 'MEDIUM',
  });

  const handleSOSPress = () => {
    setModalVisible(true);
  };

  const handleSubmitSOS = async () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Location permission is required for emergency reporting');
        setLoading(false);
        return;
      }

      const location = await getCurrentLocation();

      const incidentData = {
        type: 'SOS',
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
      Alert.alert('Success', 'SOS alert sent successfully! Help is on the way.');
      setModalVisible(false);
      setFormData({ name: '', description: '', severity: 'MEDIUM' });
    } catch (error) {
      console.error('Error sending SOS:', error);
      Alert.alert('Error', 'Failed to send SOS alert. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const emergencyContacts = [
    { name: 'Police', number: '100', icon: 'police-badge' },
    { name: 'Ambulance', number: '108', icon: 'ambulance' },
    { name: 'Fire Brigade', number: '101', icon: 'fire' },
    { name: 'Women Helpline', number: '1091', icon: 'human-female' },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Icon name="shield-check" size={80} color="#DC2626" />
        <Text style={styles.heroTitle}>Your Safety Matters</Text>
        <Text style={styles.heroSubtitle}>Press SOS for immediate emergency assistance</Text>
      </View>

      {/* SOS Button */}
      <View style={styles.sosContainer}>
        <TouchableOpacity
          style={styles.sosButton}
          onPress={handleSOSPress}
          activeOpacity={0.8}
        >
          <Icon name="alert" size={80} color="#FFFFFF" />
          <Text style={styles.sosText}>SOS</Text>
          <Text style={styles.sosSubtext}>Emergency</Text>
        </TouchableOpacity>
      </View>

      {/* Emergency Contacts */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="phone" size={24} color="#DC2626" />
          <Text style={styles.cardTitle}>Emergency Contacts</Text>
        </View>
        {emergencyContacts.map((contact, index) => (
          <TouchableOpacity
            key={index}
            style={styles.contactItem}
            onPress={() => Linking.openURL(`tel:${contact.number}`)}
          >
            <View style={styles.contactLeft}>
              <Icon name={contact.icon} size={24} color="#64748B" />
              <Text style={styles.contactName}>{contact.name}</Text>
            </View>
            <Text style={styles.contactNumber}>{contact.number}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Info Cards */}
      <View style={styles.infoGrid}>
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Icon name="shield-check" size={32} color="#059669" />
          </View>
          <Text style={styles.infoTitle}>Protected</Text>
          <Text style={styles.infoSubtitle}>24/7 monitoring</Text>
        </View>
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Icon name="phone-in-talk" size={32} color="#2563EB" />
          </View>
          <Text style={styles.infoTitle}>Quick Response</Text>
          <Text style={styles.infoSubtitle}>Instant help</Text>
        </View>
      </View>

      {/* SOS Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Icon name="alert" size={32} color="#DC2626" />
              <Text style={styles.modalTitle}>Emergency SOS Alert</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Icon name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Your Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />

              <Text style={styles.label}>Emergency Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the emergency..."
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Severity</Text>
              <View style={styles.severityContainer}>
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((severity) => (
                  <TouchableOpacity
                    key={severity}
                    style={[
                      styles.severityButton,
                      formData.severity === severity && styles.severityButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, severity })}
                  >
                    <Text
                      style={[
                        styles.severityText,
                        formData.severity === severity && styles.severityTextActive,
                      ]}
                    >
                      {severity}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={() => setModalVisible(false)}
                  disabled={loading}
                >
                  <Text style={styles.buttonTextSecondary}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={handleSubmitSOS}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonTextPrimary}>Send SOS</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  sosContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  sosButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  sosText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  sosSubtext: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#F1F5F9',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginLeft: 8,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 16,
    color: '#64748B',
    marginLeft: 12,
  },
  contactNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  infoGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  infoIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  modalForm: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#0F172A',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  severityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  severityButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  severityButtonActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  severityTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#DC2626',
  },
  buttonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  buttonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
});

export default HomeScreen;
