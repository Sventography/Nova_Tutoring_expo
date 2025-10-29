# Nova Tutoring App
Stable Expo + Expo Router setup, pinned to **Expo SDK 51** with safe configs.

## 🚀 Quick Start
1. Install dependencies:  
   npm install  

2. Start the app:  
   npx expo start -c  

3. Open in **Expo Go** (scan the QR code shown in terminal) or press:  
   - i for iOS Simulator  
   - a for Android Emulator  

## 📦 Dependencies
Core dependencies pinned for stability:  
- expo ~51.0.0  
- expo-router 3.4.8  
- expo-linear-gradient ~12.7.2  
- react 18.2.0  
- react-dom 18.2.0  
- react-native 0.74.5  
- react-native-gesture-handler ~2.16.1  
- react-native-reanimated ~3.10.1  
- react-native-safe-area-context 4.10.5  
- react-native-screens ~3.31.1  

Dev dependencies:  
- @babel/core ^7.20.0  
- @react-native-community/cli ^12.3.6  
- @react-native-community/cli-platform-android ^12.3.6  
- @react-native-community/cli-platform-ios ^12.3.6  
- @react-native-community/cli-server-api ^12.3.6  

## 🛠️ Config Files
- package.json → Dependencies + main entry (expo-router/entry).  
- app.config.js → Expo project config, no plugin errors, targets iOS + Android only.  
- metro.config.js → Aliases + RN internal resolver patch.  
- babel.config.js → Uses react-native-worklets/plugin for Reanimated 3.x.  

All four configs are synced for Expo SDK 51.

## 🔄 Reset / Reinstall Guide
If installs get corrupted (ENOENT, PluginError, etc.):  
- Stop Expo first (Ctrl+C)  
- Run these commands in order:  
  rm -rf node_modules package-lock.json  
  npm cache clean --force  
  npm install  
  npx expo install expo-router expo-linear-gradient  
  npx expo start -c  

## ⚠️ Notes
- Web support is disabled (platforms: ["ios","android"]) to avoid react-native-web warnings.  
- To enable web later:  
  1. Add "web" back to platforms in app.config.js.  
  2. Install dependency:  
     npx expo install react-native-web  

## ❤️ Stable Baseline
This project is locked to:  
- Expo SDK 51  
- React Native 0.74.5  
- Expo Router 3.4.8  

Use this baseline to avoid plugin errors and version mismatches.
