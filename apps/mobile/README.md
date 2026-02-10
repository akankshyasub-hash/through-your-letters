# Mobile App (iOS + Android)

## Setup

```bash
# Install dependencies
cd apps/mobile
pnpm install

# Add platforms (first time only)
pnpm add:ios
pnpm add:android

# Build web app first
cd ../web
pnpm build
cd ../mobile

# Sync web build to native platforms
pnpm sync

# Open in Xcode (iOS)
pnpm open:ios

# Open in Android Studio (Android)
pnpm open:android
```

## Development

The mobile app uses the same React codebase as the web app (`apps/web`).

Changes to web code automatically sync to mobile:

```bash
cd apps/web
pnpm build
cd ../mobile
pnpm sync
```

## Native Features

- Camera access for photo upload
- Geolocation for PIN code detection
- Native share functionality
- Haptic feedback
- Status bar customization

## Build for Production

### iOS
1. Open in Xcode: `pnpm open:ios`
2. Select signing & capabilities
3. Archive → Distribute to App Store

### Android
1. Open in Android Studio: `pnpm open:android`
2. Build → Generate Signed Bundle/APK
3. Upload to Google Play Console
