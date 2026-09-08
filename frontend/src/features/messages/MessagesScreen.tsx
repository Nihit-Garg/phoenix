import React, { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, KeyboardAvoidingView, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { CivilianIdentity } from '../../core/security/identity';
import { PeerDirectory } from '../../core/storage/PeerDirectory';
import { PeerEndpoint } from '../../../../backend/src/transport/PeerTransport';
import { ChatService } from './ChatService';
import { CHAT_LIMITS, ChatState, Contact } from './model';
import { contactFingerprint, friendCard, normalizeContact, parseFriendCard } from './crypto';

interface Props { service: ChatService | null; state: ChatState | null; identity: CivilianIdentity | null; peers: PeerEndpoint[]; error: string | null; active: boolean; onHome(): void; }

function Button({ label, onPress, secondary = false, disabled = false }: { label: string; onPress(): void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button, secondary && s.secondary, disabled && s.disabled]}>
    <Text style={[s.buttonText, secondary && s.secondaryText]}>{label}</Text>
  </Pressable>;
}

export function MessagesScreen({ service, state, identity, peers, error, active, onHome }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [card, setCard] = useState('');
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nearby, setNearby] = useState<Contact[]>([]);
  const [fingerprint, setFingerprint] = useState('');
  const [myFingerprint, setMyFingerprint] = useState('');
  const chatScroll = useRef<ScrollView>(null);
  const friend = state?.friends.find((item) => item.encryptionPublicKey === selected);
  const messages = state?.messages.filter((m) => m.friendId === selected) ?? [];
  const networkAvailable = peers.some((p) => p.status === 'connected');

  useEffect(() => { setName(state?.name ?? ''); }, [state?.name]);
  useEffect(() => {
    if (!active) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selected) setSelected(null);
      else if (adding) setAdding(false);
      else onHome();
      return true;
    });
    return () => subscription.remove();
  }, [active, selected, adding, onHome]);
  useEffect(() => {
    let alive = true;
    void new PeerDirectory().list().then((directory) => {
      if (!alive) return;
      const connected = new Set(peers.filter((p) => p.status === 'connected').map((p) => p.peerId));
      setNearby(directory.filter((p) => p.role === 'civilian' && connected.has(p.peerId)).flatMap((p) => {
        try { return [normalizeContact({ name: p.displayName, encryptionPublicKey: p.encryptionPublicKey, signingPublicKey: p.signingPublicKey })]; } catch { return []; }
      }));
    }).catch(() => { if (alive) setNearby([]); });
    return () => { alive = false; };
  }, [peers]);
  useEffect(() => {
    let alive = true;
    if (friend) void contactFingerprint(friend).then((value) => { if (alive) setFingerprint(value); }).catch(() => {});
    else setFingerprint('');
    return () => { alive = false; };
  }, [friend?.encryptionPublicKey, friend?.signingPublicKey]);
  useEffect(() => {
    let alive = true;
    if (identity) void contactFingerprint({ ...identity, name: state?.name ?? '' }).then((value) => { if (alive) setMyFingerprint(value); }).catch(() => {});
    return () => { alive = false; };
  }, [identity]);
  useEffect(() => {
    if (active && selected && service) void service.markRead(selected).catch((cause) => setNotice(String(cause)));
  }, [active, selected, state?.messages, service]);

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setNotice(null);
    try { await action(); } catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { setBusy(false); }
  };
  const add = (contact: Contact) => run(async () => {
    if (!service) throw new Error('Messaging is still starting.');
    await service.addFriend(contact);
    setCard(''); setAdding(false); setSelected(contact.encryptionPublicKey);
  });
  const openChat = (id: string) => { setSelected(id); setDraft(''); setNotice(null); };
  const warnings = <>{error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}{notice ? <Text accessibilityRole="alert" style={s.error}>{notice}</Text> : null}</>;

  if (!state || !service || !identity) return <View style={s.page}><Text style={s.title}>Messages</Text><Text style={s.muted}>{error ?? 'Opening your private conversations…'}</Text></View>;

  if (friend) return (
    <KeyboardAvoidingView style={s.page} behavior="height">
      <View style={s.chatHeader}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to friends" onPress={() => setSelected(null)} style={s.back}><Text style={s.backText}>‹</Text></Pressable>
        <View style={s.grow}><Text style={s.chatName}>{friend.name}</Text><Text style={s.muted}>{friend.status === 'accepted' ? 'Private conversation' : friend.status === 'outgoing' ? 'Friend request pending' : friend.status === 'incoming' ? 'Wants to be your friend' : 'Request declined'}</Text></View>
      </View>
      <Text selectable style={s.fingerprint}>Their safety code: {fingerprint || 'Loading…'}</Text>
      {warnings}
      {friend.status === 'incoming' ? <View style={s.card}>
        <Text style={s.body}>Accept only if you recognise this person. Compare their safety code with the code on their phone.</Text>
        <View style={s.row}><Button label="Accept friend" disabled={busy || !state.name} onPress={() => void run(() => service.respond(selected!, true))} /><Button secondary label="Decline" disabled={busy || !state.name} onPress={() => void run(() => service.respond(selected!, false))} /></View>
        {!state.name ? <Text style={s.error}>Go back and save your name first.</Text> : null}
      </View> : null}
      {friend.status === 'outgoing' ? <View style={s.card}><Text style={s.body}>Your request is saved. Your friend can accept when a nearby connection reaches their phone.</Text><Button secondary disabled={busy} label="Resend request" onPress={() => void run(() => service.retry(selected!))} /></View> : null}
      <ScrollView ref={chatScroll} style={s.grow} contentContainerStyle={s.bubbles} onContentSizeChange={() => chatScroll.current?.scrollToEnd({ animated: true })} keyboardShouldPersistTaps="handled">
        {!messages.length && friend.status === 'accepted' ? <Text style={s.empty}>You’re connected as friends. Say hello.</Text> : null}
        {messages.map((message) => <View key={`${message.direction}-${message.id}`} style={[s.bubble, message.direction === 'out' ? s.outgoing : s.incoming]}>
          <Text selectable style={[s.messageText, message.direction === 'out' && s.outgoingText]}>{message.text}</Text>
          <Text style={[s.messageMeta, message.direction === 'out' && s.outgoingMeta]}>{new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{message.direction === 'out' ? ` · ${message.status === 'queued' ? 'Waiting for connection' : message.status === 'sent' ? 'Sent' : message.status === 'delivered' ? 'Delivered' : 'Not delivered'}` : ''}</Text>
        </View>)}
      </ScrollView>
      {friend.status === 'accepted' ? <>
        <Text style={s.connectionHint}>{networkAvailable ? 'Messages travel through nearby Mirage phones.' : 'No connection right now. New messages will wait safely on this phone.'}</Text>
        <View style={s.row}><Pressable accessibilityRole="button" onPress={() => void run(() => service.retry(selected!))}><Text style={s.link}>Retry pending</Text></Pressable><Pressable accessibilityRole="button" onPress={() => Alert.alert('Clear conversation?', 'This removes this conversation and unsent texts on this phone only. Your friend’s copy is kept.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: () => void run(() => service.clearConversation(selected!)) }])}><Text style={s.link}>Clear conversation</Text></Pressable></View>
        <View style={s.composer}>
          <TextInput accessibilityLabel="Message" placeholder="Write a message…" placeholderTextColor="#887579" style={s.composerInput} multiline maxLength={CHAT_LIMITS.text} value={draft} onChangeText={setDraft} />
          <Button label="Send" disabled={busy || !draft.trim()} onPress={() => void run(async () => { await service.sendMessage(selected!, draft); setDraft(''); })} />
        </View>
      </> : null}
    </KeyboardAvoidingView>
  );

  const accepted = state.friends.filter((f) => f.status === 'accepted');
  const requests = state.friends.filter((f) => f.status === 'incoming' || f.status === 'outgoing');
  return (
    <ScrollView style={s.page} contentContainerStyle={s.list} keyboardShouldPersistTaps="handled">
      <View style={s.heading}><View style={s.grow}><Text style={s.eyebrow}>STAY IN TOUCH</Text><Text style={s.title}>Messages</Text></View><Button label={adding ? 'Done' : 'Add friend'} secondary onPress={() => setAdding(!adding)} /></View>
      <Text style={s.body}>Your people, even without internet. Both phones need Mirage open and a nearby route to exchange messages.</Text>
      {warnings}
      {!state.name || adding ? <View style={s.card}>
        <Text style={s.section}>Your name</Text>
        <Text style={s.muted}>This is shown with your friend requests.</Text>
        <TextInput accessibilityLabel="Your name" style={s.input} placeholder="Enter your name" placeholderTextColor="#887579" maxLength={CHAT_LIMITS.name} value={name} onChangeText={setName} />
        <Button label="Save name" disabled={busy || !name.trim()} onPress={() => void run(() => service.setName(name))} />
      </View> : null}
      {adding ? <>
        <View style={s.card}>
          <Text style={s.section}>Your friend card</Text><Text style={s.muted}>Share with someone you know, or let them copy it from this phone. It contains public identity information only.</Text>
          <Text selectable style={s.fingerprint}>Your safety code: {myFingerprint || 'Loading…'}</Text>
          {state.name ? <Text selectable style={s.friendCard}>{friendCard(identity, state.name)}</Text> : null}
          <Button label="Share my friend card" disabled={!state.name || busy} onPress={() => void run(async () => { await Share.share({ message: friendCard(identity, state.name), title: 'My Mirage friend card' }); })} />
        </View>
        <View style={s.card}><Text style={s.section}>Add with a friend card</Text><TextInput accessibilityLabel="Friend card" style={[s.input, s.cardInput]} multiline placeholder="Paste your friend’s card here" placeholderTextColor="#887579" autoCapitalize="none" autoCorrect={false} maxLength={2048} value={card} onChangeText={setCard} /><Button label="Send friend request" disabled={busy || !state.name || !card.trim()} onPress={() => { try { void add(parseFriendCard(card)); } catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Invalid friend card.'); } }} /></View>
        <View style={s.card}><Text style={s.section}>People nearby</Text><Text style={s.muted}>Choose a device and compare safety codes before accepting. People may share the same device name.</Text>
          {nearby.filter((c) => !state.friends.some((f) => f.encryptionPublicKey === c.encryptionPublicKey)).map((contact) => <View style={s.personRow} key={contact.encryptionPublicKey}><View style={s.grow}><Text style={s.personName}>{contact.name}</Text><Text style={s.muted}>Device {contact.encryptionPublicKey.slice(0, 8)}</Text></View><Button label="Add" secondary disabled={!state.name || busy} onPress={() => void add(contact)} /></View>)}
          {!nearby.length ? <Text style={s.empty}>No verified Civilian devices nearby yet. You can also use a friend card.</Text> : null}
        </View>
      </> : null}
      {requests.length ? <><Text style={s.section}>Friend requests</Text>{requests.map((item) => <Pressable accessibilityRole="button" style={s.friendRow} key={item.encryptionPublicKey} onPress={() => openChat(item.encryptionPublicKey)}><View style={s.avatar}><Text style={s.avatarText}>{item.name.charAt(0).toUpperCase()}</Text></View><View style={s.grow}><Text style={s.personName}>{item.name}</Text><Text style={s.muted}>{item.status === 'incoming' ? 'Tap to accept or decline' : 'Waiting for acceptance'}</Text></View><Text style={s.chevron}>›</Text></Pressable>)}</> : null}
      <Text style={s.section}>Conversations</Text>
      {!accepted.length ? <View style={s.card}><Text style={s.section}>A conversation starts with a friend.</Text><Text style={s.body}>Tap Add friend. Once they accept, you can exchange private offline messages.</Text></View> : null}
      {accepted.map((item) => {
        const history = state.messages.filter((m) => m.friendId === item.encryptionPublicKey);
        const last = history[history.length - 1];
        const unread = history.filter((m) => !m.read).length;
        return <Pressable accessibilityRole="button" style={s.friendRow} key={item.encryptionPublicKey} onPress={() => openChat(item.encryptionPublicKey)}><View style={s.avatar}><Text style={s.avatarText}>{item.name.charAt(0).toUpperCase()}</Text></View><View style={s.grow}><Text style={s.personName}>{item.name}</Text><Text numberOfLines={1} style={s.muted}>{last ? `${last.direction === 'out' ? 'You: ' : ''}${last.text}` : 'Say hello'}</Text></View>{unread ? <Text style={s.unread}>{unread}</Text> : <Text style={s.chevron}>›</Text>}</Pressable>;
      })}
      {state.friends.filter((f) => f.status === 'declined').map((f) => <Text key={f.encryptionPublicKey} style={s.muted}>{f.name} declined your friend request.</Text>)}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FCF5F5', paddingHorizontal: 18 }, list: { paddingVertical: 22, gap: 16, paddingBottom: 32 },
  grow: { flex: 1 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 12 }, eyebrow: { color: '#B6354C', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }, title: { color: '#292027', fontSize: 30, fontWeight: '800', marginTop: 4 },
  body: { color: '#75616A', fontSize: 14, lineHeight: 21 }, muted: { color: '#75616A', fontSize: 12, lineHeight: 18 },
  section: { color: '#382B33', fontSize: 17, fontWeight: '700' }, card: { backgroundColor: 'white', borderRadius: 18, padding: 16, gap: 12, borderWidth: 1, borderColor: '#EFDFE3' },
  input: { borderWidth: 1, borderColor: '#D7C2C9', borderRadius: 12, padding: 12, color: '#292027', fontSize: 15, backgroundColor: '#FFFAFB' }, cardInput: { minHeight: 90, textAlignVertical: 'top' },
  button: { borderRadius: 12, backgroundColor: '#B6354C', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: 'white', fontWeight: '700', fontSize: 13 }, secondary: { backgroundColor: '#F5E5E9' }, secondaryText: { color: '#922B41' }, disabled: { opacity: 0.45 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }, error: { color: '#A61A35', fontSize: 13, marginVertical: 8 }, empty: { color: '#75616A', fontSize: 14, textAlign: 'center', paddingVertical: 24, lineHeight: 21 },
  friendCard: { fontFamily: 'monospace', color: '#75616A', fontSize: 11 }, fingerprint: { color: '#75616A', fontSize: 11, paddingVertical: 10, lineHeight: 16 },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white', padding: 16, borderRadius: 16 }, personRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5E5E9', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#922B41', fontWeight: '800', fontSize: 18 }, personName: { color: '#382B33', fontSize: 16, fontWeight: '700' }, chevron: { fontSize: 24, color: '#A88894' }, unread: { backgroundColor: '#B6354C', color: 'white', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12 }, back: { paddingHorizontal: 10 }, backText: { fontSize: 40, color: '#922B41' }, chatName: { fontSize: 21, fontWeight: '800', color: '#292027' },
  bubbles: { gap: 12, paddingVertical: 18 }, bubble: { borderRadius: 18, padding: 13, maxWidth: '87%', gap: 6 }, outgoing: { alignSelf: 'flex-end', backgroundColor: '#A72E46', borderBottomRightRadius: 4 }, incoming: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4 }, messageText: { color: '#292027', fontSize: 16, lineHeight: 23 }, outgoingText: { color: 'white' }, messageMeta: { color: '#75616A', fontSize: 10 }, outgoingMeta: { color: '#F8DBE2' },
  composer: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', paddingVertical: 12 }, composerInput: { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 12, maxHeight: 120, color: '#292027', fontSize: 16 }, connectionHint: { color: '#75616A', fontSize: 11, textAlign: 'center', paddingTop: 8 }, link: { color: '#922B41', fontSize: 12, paddingVertical: 6 },
});
