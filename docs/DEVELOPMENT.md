# Android development builds

Mirage needs custom Android development builds. Expo Go and Expo Web are not supported runtimes for the future Wi-Fi Direct, UDP, MapLibre, and native crypto modules.

## Wi-Fi Direct validation

Part 1 adds local Android Expo modules to both apps. Rebuild each development
build after native changes, grant the Nearby Wi-Fi permission, and test peer
discovery plus connection with two physical Android phones. The same build now
binds UDP port 9000; verify incoming and outgoing packets after a Wi-Fi Direct
group forms. Expo Go cannot load these modules.

Prerequisites are Node.js 22.13+, Android Studio/SDK, and a USB-debugging-enabled Android phone. Run `npm run android` in `frontend/` or `hospital/`; after installation, run `npm start` for JavaScript updates. Rebuild when native dependencies or `app.json` change.
