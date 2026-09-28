export interface ChatMessage {
  id: string;
  text: string;
  user: string;
  timestamp: number;
}

export interface User {
  id: string;
  name: string;
}

export interface ServerToClientEvents {
  message: (message: ChatMessage) => void;
  userJoined: (user: User) => void;
  typing: (userId: string) => void;
  pong: (payload: { ok: boolean; at: number }) => void;
}

export interface ClientToServerEvents {
  sendMessage: (payload: { text: string; user: string }) => void;
  joinRoom: (room: string) => void;
  typing: (userId: string) => void;
  ping: (payload: { id: string }, ack?: (response: { ok: boolean; at: number }) => void) => void;
}

export interface LifecycleEntry {
  id: string;
  label: string;
  at: number;
}
