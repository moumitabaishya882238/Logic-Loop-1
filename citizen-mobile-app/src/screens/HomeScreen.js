import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import api from '../services/api';
import { getCurrentLocation, requestLocationPermission } from '../utils/location';

const HomeScreen = () => {
  const [sendingSos, setSendingSos] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [statusText, setStatusText] = useState('Tap SOS for immediate emergency assistance');
  const audioRecorderPlayer = useMemo(() => new AudioRecorderPlayer(), []);

  useEffect(() => {
    return () => {
      audioRecorderPlayer.stopRecorder().catch(() => null);
      audioRecorderPlayer.removeRecordBackListener();
    };
  }, [audioRecorderPlayer]);

  const requestAudioPermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'SurakshaNet needs microphone access to send SOS voice notes',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.warn('Audio permission error:', error);
      return false;
    }
  };

  const withTimeout = (promise, timeoutMs, timeoutMessage) => {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
      ),
    ]);
  };

  const recordVoiceForSevenSeconds = async () => {
    const fileName = `sos_${Date.now()}.m4a`;
    const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
    let intervalId;

    try {
      await withTimeout(
        audioRecorderPlayer.startRecorder(filePath),
        8000,
        'Microphone did not start. Please try again.'
      );
      setCountdown(7);
      setStatusText('Recording voice note (7s)...');

      intervalId = setInterval(() => {
        setCountdown((previous) => (previous > 0 ? previous - 1 : 0));
      }, 1000);

      await new Promise((resolve) => setTimeout(resolve, 7000));

      const recordedPath = await withTimeout(
        audioRecorderPlayer.stopRecorder(),
        5000,
        'Unable to stop voice recording. Please retry.'
      );
      audioRecorderPlayer.removeRecordBackListener();

      const normalizedPath = recordedPath.startsWith('file://')
        ? recordedPath.replace('file://', '')
        : recordedPath;

      const voiceBase64 = await withTimeout(
        RNFS.readFile(normalizedPath, 'base64'),
        5000,
        'Unable to read recorded voice note.'
      );

      return {
        dataUri: `data:audio/mp4;base64,${voiceBase64}`,
        durationSeconds: 7,
      };
    } finally {
      if (intervalId) {
        clearInterval(intervalId);
      }
    }
  };

  const handleSOSPress = async () => {
    if (sendingSos) {
      return;
    }

    setSendingSos(true);
    setStatusText('Preparing SOS alert...');

    try {
      setStatusText('Requesting location permission...');
      const hasLocationPermission = await withTimeout(
        requestLocationPermission(),
        10000,
        'Location permission request timed out. Please tap SOS again.'
      );

      if (!hasLocationPermission) {
        throw new Error('Location permission is required to send SOS.');
      }

      setStatusText('Requesting microphone permission...');
      const hasAudioPermission = await withTimeout(
        requestAudioPermission(),
        10000,
        'Microphone permission request timed out. Please tap SOS again.'
      );

      if (!hasAudioPermission) {
        throw new Error('Microphone permission is required to attach SOS voice note.');
      }

      setStatusText('Capturing exact location...');
      const location = await withTimeout(
        getCurrentLocation(),
        15000,
        'Could not fetch location quickly. Move to open sky and retry.'
      );

      const voice = await withTimeout(
        recordVoiceForSevenSeconds(),
        17000,
        'Voice recording timed out. Please retry.'
      );

      setStatusText('Sending SOS to command center...');
      const incidentData = {
        type: 'SOS',
        location: {
          lat: Number(location.lat.toFixed(6)),
          lng: Number(location.lng.toFixed(6)),
          address: `Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}`,
        },
        description: 'SOS voice emergency alert from citizen app',
        severity: 'CRITICAL',
        reportedBy: 'Citizen Mobile App',
        voiceNoteBase64: voice.dataUri,
        voiceDurationSeconds: voice.durationSeconds,
      };

      await api.createSOSIncident(incidentData);
      Alert.alert('SOS Sent', 'Voice SOS and exact location sent. Help is on the way.');
      setStatusText('SOS sent successfully. Tap again if needed.');
    } catch (error) {
      console.error('SOS flow failed:', error);
      let message = error instanceof Error ? error.message : 'Failed to send SOS.';

      if (message.includes('Unable to reach backend') || message.includes('Network Error')) {
        message =
          'Could not connect to backend from phone. Keep backend running and run: adb reverse tcp:8001 tcp:8001';
      }

      Alert.alert('SOS Failed', message);
      setStatusText('SOS failed. Please try again.');
    } finally {
      setCountdown(0);
      setSendingSos(false);
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
        <Text style={styles.heroSubtitle}>One tap records 7s voice + sends exact location</Text>
      </View>

      {/* SOS Button */}
      <View style={styles.sosContainer}>
        <TouchableOpacity
          style={styles.sosButton}
          onPress={handleSOSPress}
          disabled={sendingSos}
          activeOpacity={0.8}
        >
          {sendingSos ? (
            <>
              <ActivityIndicator color="#FFFFFF" size="large" />
              <Text style={styles.sosSubtext}>Processing...</Text>
              {countdown > 0 ? <Text style={styles.countdownText}>{countdown}s</Text> : null}
            </>
          ) : (
            <>
              <Icon name="alert" size={80} color="#FFFFFF" />
              <Text style={styles.sosText}>SOS</Text>
              <Text style={styles.sosSubtext}>Tap to Send</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>SOS Status</Text>
        <Text style={styles.statusValue}>{statusText}</Text>
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

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Slate-900 Main background
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F1F5F9', // Slate-100 Text
    marginTop: 20,
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#94A3B8', // Slate-400 Text
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 24,
  },
  sosContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingBottom: 50,
  },
  sosButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  sosText: {
    fontSize: 56,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
    letterSpacing: 1,
  },
  sosSubtext: {
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 4,
    fontWeight: '500',
  },
  countdownText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statusCard: {
    backgroundColor: '#1E293B', // Slate-800 Card
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155', // Slate-700 Border
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  statusLabel: {
    fontSize: 12,
    color: '#94A3B8', // Slate-400 Label
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusValue: {
    fontSize: 16,
    color: '#F1F5F9', // Slate-100 Text
    marginTop: 8,
    fontWeight: '600',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#1E293B', // Slate-800 Card
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F1F5F9', // Slate-100 Text
    marginLeft: 12,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155', // Slate-700 Border
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 16,
    color: '#CBD5E1', // Lighter Slate Text
    marginLeft: 16,
    fontWeight: '500',
  },
  contactNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6', // Blue-500 emphasis
  },
  infoGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 32,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoIconContainer: {
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
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
    backgroundColor: '#1E293B', // Slate-800 button
    borderWidth: 1,
    borderColor: '#334155', // Slate-700 border
  },
  buttonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8', // Slate-400 Text
  },
});

export default HomeScreen;
