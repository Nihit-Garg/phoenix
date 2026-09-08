# Offline friends and messaging

Implemented in the Civilian app on `anshul-dev`. Native Nearby Connections, peer exchange, the shared mesh engine, and SOS routing remain unchanged. Home and Messages share the existing device identity and mesh instance; switching tabs does not stop the network. No new native dependency or cloud service is required.

## User flow

1. Open **Messages**, enter your name and save it. This name also appears on Home and in new SOS payloads. SOS remains available before setting a name.
2. Tap **Add friend**. Choose a verified Civilian in **People nearby**, or paste a friend card shared by the other person.
3. To share a card, the other person opens **Add friend → Share my friend card**. The selectable card can also be copied directly. It contains a name, public keys and a signature; never private keys. An online sharing app is optional and is not part of message transport.
4. The recipient sees a friend request. Compare the displayed safety code with the person's own code before accepting, especially when devices have the same name. A self-signed name alone does not prove who someone is.
5. The recipient accepts or declines. Acceptance opens a conversation on both phones once delivered. Simultaneous requests also express mutual consent. Declining blocks repeated requests locally. Friend removal/unblocking is not yet implemented.
6. Open the conversation, type and press **Send**. Incoming bubbles, conversation previews and unread indicators update automatically. Viewing a conversation clears its local unread count.

Messaging needs no Hospital manifest; SOS still does. Messages can arrive while Home is selected and remain unread until the conversation is viewed. Switching tabs keeps the current conversation and draft in memory; Android Back returns through the conversation/list to Home. Background notifications are not implemented.

## Delivery states

| State | Meaning |
| --- | --- |
| Waiting for connection | Text is saved; the current attempt has no usable route. |
| Sent | A transfer was accepted, but recipient storage is not confirmed. |
| Delivered | The intended friend returned a signed, encrypted receipt after saving the message. This is not a read receipt. |
| Not delivered | The local retry window expired. Use Retry pending. |

Both endpoints and intermediate relays must have Mirage open. A continuous route is needed during an exchange; relays do not durably store messages for later forwarding. The sender can queue while disconnected, close the app, then reopen it to resume delivery. Actual transfer needs no internet or mobile data, but still needs a nearby route.

## Storage, protocol and limits

- X25519 sealed boxes encrypt to the recipient. Ed25519 signs the existing canonical envelope fields. Both friend keys are pinned.
- The existing `p2p` kind and `normal` priority carry requests, acceptance/decline, text and receipts. SOS ACK handling is separate.
- Mutations are serialized. Profile, friends, history, duplicate IDs and pending bodies are sealed to the local device key before saving in AsyncStorage. Only then is state published or a receipt sent. Private keys stay in existing SecureStore.
- Each retry gets a fresh signed outer envelope and retains a stable encrypted payload ID. This crosses the existing mesh duplicate cache; recipients suppress repeated texts and re-send receipts. Mesh behavior is unchanged.
- Checks run every 15 seconds with backoff capped at 60 seconds, plus connection-triggered checks. Pending items expire after 24 local hours. Receipts use ID/key correlation rather than comparing phone clocks; remote timestamps are display data.
- Named limits in `model.ts`: 2,000 characters per text, 100 friend records, 2,000 stored texts, 200 pending items and 4,000 received message IDs. Capacity errors preserve data. Larger-scale storage and traffic rate limiting remain future work.
- Clear conversation confirms before removing this phone's history and pending texts; it leaves the other person's copy alone. Received IDs survive clearing so ordinary retries do not recreate bubbles. Very old retries beyond the bounded ID window can reappear.
- Key loss makes saved ciphertext inaccessible. Storage/decryption failure preserves the saved bytes rather than resetting history.

## Automated validation

From the repository root:

```powershell
node --test scripts/messaging.test.mjs scripts/demo-blockers.test.mjs
```

Tests use the actual shared mesh with deterministic links and persistence doubles, plus real libsodium via its installed Node/WASM adapter. They cover bidirectional relay delivery, consent/decline, simultaneous requests, lost receipts, duplicates after clearing, restart/reconnect, concurrent sends/receipts, storage failure, expiry/retry, malformed bodies, signatures, wrong keys, tampering and encrypted storage. Android native bindings still require physical testing.

## Physical acceptance test

1. Install updated Civilian APKs on two phones. Matching development clients can load updated JavaScript; standalone APKs need a rebuild to include it.
2. Keep both apps open. Enable Wi-Fi/Bluetooth/Location, grant existing permissions, disable mobile data and avoid an internet-connected Wi-Fi network.
3. Save a different name on each phone. Add through People nearby, compare safety codes, and accept on the other phone. Also test adding via a shared card.
4. Send text both ways. Verify bubble content, unread indicator and Delivered status.
5. Disconnect the recipient, send another text and restart the sender app. Restore the route; verify the saved text arrives once and becomes Delivered.
6. Add a third phone as relay, with Mirage open. Separate endpoints so only the relay connects them. Repeat both directions. The relay needs no friend setup.
7. Switch Home/Messages repeatedly and verify links persist. Run the existing SOS/Hospital demo alongside messaging.
8. Check keyboard/composer layout on small phones, long multilingual text, declined requests and clear-history confirmation.

Physical messaging tests remain pending. Background service, notifications, attachments, groups, typing indicators, read receipts, account recovery, key rotation UI and friend removal/unblocking are not part of this version.
