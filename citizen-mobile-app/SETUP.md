# SurakshaNet Citizen Mobile App - Setup Guide

## 📱 React Native CLI Setup

### Prerequisites

#### 1. Node.js & npm/yarn
```bash
node --version  # Should be 18+
npm --version   # or yarn --version
```

#### 2. React Native CLI
```bash
npm install -g react-native-cli
```

#### 3. Platform-Specific Setup

##### Android Setup
1. **Install Android Studio**
   - Download from: https://developer.android.com/studio
   - During installation, ensure these are selected:
     - Android SDK
     - Android SDK Platform
     - Android Virtual Device

2. **Configure Environment Variables**
   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

3. **Install Java Development Kit (JDK 11)**
   ```bash
   # Ubuntu/Debian
   sudo apt install openjdk-11-jdk
   
   # macOS (using Homebrew)
   brew install --cask adoptopenjdk11
   ```

##### iOS Setup (macOS only)
1. **Install Xcode**
   - Download from Mac App Store
   - Install Xcode Command Line Tools:
     ```bash
     xcode-select --install
     ```

2. **Install CocoaPods**
   ```bash
   sudo gem install cocoapods
   ```

## 🚀 Running the Mobile App

### Step 1: Navigate to Project
```bash
cd /app/citizen-mobile-app
```

### Step 2: Install Dependencies
```bash
yarn install

# For iOS only
cd ios && pod install && cd ..
```

### Step 3: Configure Backend URL

Edit `src/services/api.js`:
```javascript
const BACKEND_URL = 'YOUR_BACKEND_URL_HERE';
// Example: 'https://incident-command-10.preview.emergentagent.com'
```

### Step 4: Run the App

#### Android
```bash
# Start Metro bundler
yarn start

# In a new terminal, run Android
yarn android
# or
npx react-native run-android
```

#### iOS
```bash
# Start Metro bundler
yarn start

# In a new terminal, run iOS
yarn ios
# or
npx react-native run-ios
```

## 🔧 Android Permissions Setup

The app requires location permissions. These are already configured in the project:

**AndroidManifest.xml** (Already configured)
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

## 🗺️ Maps Setup

### Android Maps
1. Get Google Maps API key from: https://console.cloud.google.com/
2. Create `android/app/src/main/AndroidManifest.xml` and add:
```xml
<meta-data
  android:name="com.google.android.geo.API_KEY"
  android:value="YOUR_GOOGLE_MAPS_API_KEY"/>
```

### iOS Maps
1. Get Google Maps API key
2. Edit `ios/Podfile` (already configured)
3. In `ios/[AppName]/AppDelegate.m`, add:
```objc
#import <GoogleMaps/GoogleMaps.h>

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [GMSServices provideAPIKey:@"YOUR_GOOGLE_MAPS_API_KEY"];
  // ... rest of the code
}
```

## 🐛 Troubleshooting

### Android Issues

**Issue: App won't build**
```bash
cd android
./gradlew clean
cd ..
yarn android
```

**Issue: Metro bundler connection refused**
```bash
adb reverse tcp:8081 tcp:8081
yarn start
```

**Issue: Device not detected**
```bash
adb devices
# If no devices, check USB debugging is enabled
```

### iOS Issues

**Issue: Pod install fails**
```bash
cd ios
pod deintegrate
pod install
cd ..
```

**Issue: Build fails in Xcode**
- Clean build folder: Product → Clean Build Folder
- Clear derived data: Xcode → Preferences → Locations → Derived Data → Delete

### General Issues

**Issue: Metro bundler cache problems**
```bash
yarn start --reset-cache
```

**Issue: Node modules corruption**
```bash
rm -rf node_modules
yarn install
```

## 📦 Building for Production

### Android APK
```bash
cd android
./gradlew assembleRelease
# APK location: android/app/build/outputs/apk/release/app-release.apk
```

### iOS Archive
1. Open `ios/SurakshaNetCitizen.xcworkspace` in Xcode
2. Select "Any iOS Device" as target
3. Product → Archive
4. Follow distribution wizard

## 🔐 Security Checklist

- [ ] Update backend URL to production server
- [ ] Configure proper Google Maps API key
- [ ] Enable ProGuard for Android release
- [ ] Set up proper code signing for iOS
- [ ] Test location permissions on real devices
- [ ] Verify API endpoints are working

## 📸 Testing

### Test on Physical Device

**Android:**
1. Enable Developer Options on device
2. Enable USB Debugging
3. Connect via USB
4. Run: `yarn android`

**iOS:**
1. Connect iPhone via USB
2. Trust the computer
3. Select device in Xcode
4. Run: `yarn ios` or use Xcode

### Test Features
- [ ] SOS button functionality
- [ ] Location permission request
- [ ] GPS location capture
- [ ] Report incident form
- [ ] Nearby alerts list
- [ ] Safety map with markers
- [ ] Emergency contacts dial

## 📚 Key Dependencies

- `react-native`: 0.73.0
- `@react-navigation/native`: Navigation framework
- `react-native-maps`: Map integration
- `react-native-vector-icons`: Icon library
- `@react-native-community/geolocation`: GPS location
- `axios`: HTTP client

## 🆘 Need Help?

### Check Logs
```bash
# Android logs
npx react-native log-android

# iOS logs
npx react-native log-ios
```

### Useful Commands
```bash
# Check React Native environment
npx react-native doctor

# Check device connection
adb devices  # Android
xcrun xctrace list devices  # iOS
```

## ✅ Verification Checklist

After setup, verify:
- [ ] App launches without errors
- [ ] Bottom navigation works
- [ ] SOS button is visible
- [ ] Location permission dialog appears
- [ ] Map loads correctly
- [ ] Can submit test incident
- [ ] Backend API connection works

---

**For team members:**
- Moumita Baishya - Web Dashboard (no mobile setup needed)
- Amlandwip Das - Backend integration testing
- Sahid Ahmed - **PRIMARY**: Mobile app development & testing
- Harish Gohain - AI service integration

Happy Coding! 🚀
