# Android development builds

Mirage needs custom Android development builds. Expo Go and Expo Web are not supported runtimes for the future Wi-Fi Direct, UDP, MapLibre, and native crypto modules.

Prerequisites are Node.js 22.13+, Android Studio/SDK, and a USB-debugging-enabled Android phone. Run `npm run android` in `frontend/` or `hospital/`; after installation, run `npm start` for JavaScript updates. Rebuild when native dependencies or `app.json` change.
