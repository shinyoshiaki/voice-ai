import { atom } from "recoil";
import { v4 } from "uuid";

export const connectionStateAtom = atom<RTCPeerConnectionState>({
  key: v4(),
  default: "new",
});

export const chatLogsAtom = atom<{ [index: number]: ChatLog }>({
  key: v4(),
  default: {},
});
export interface ChatLog {
  role: "user" | "assistant";
  content: string;
  index: number;
}

export const aiStateAtom = atom<"speaking" | "waiting">({
  key: v4(),
  default: "waiting",
});
