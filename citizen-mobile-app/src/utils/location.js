import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform } from 'react-native';

const EMULATOR_DEFAULT_LAT = 37.4219983;
const EMULATOR_DEFAULT_LNG = -122.084;
const DEFAULT_LOCATION_TOLERANCE = 0.0007;

const isLikelyEmulatorDefaultLocation = (lat, lng) => {
  return (
    Math.abs(lat - EMULATOR_DEFAULT_LAT) <= DEFAULT_LOCATION_TOLERANCE &&
    Math.abs(lng - EMULATOR_DEFAULT_LNG) <= DEFAULT_LOCATION_TOLERANCE
  );
};

export const requestLocationPermission = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'SurakshaNet needs access to your location for emergency reporting',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  return true;
};

export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (position.coords.mocked || isLikelyEmulatorDefaultLocation(lat, lng)) {
          reject(
            new Error(
              'Detected mocked/default emulator location. Set your emulator GPS location or use a real device.'
            )
          );
          return;
        }

        resolve({
          lat,
          lng,
          accuracy: position.coords.accuracy,
        });
      },
      error => reject(error),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
};
