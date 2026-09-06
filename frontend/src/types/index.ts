export type ScreenType = 'home' | 'messages' | 'chat' | 'profile';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  isSelf: boolean;
  content: string;
  timestamp: string;
  hops?: number;
  priority?: 'NORMAL' | 'HIGH' | 'EMERGENCY';
  status?: 'sending' | 'sent' | 'delivered';
}

export interface Conversation {
  id: string;
  peerId: string;
  peerName: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isEmergency?: boolean;
  hopCount: number;
  isOnline: boolean;
}
