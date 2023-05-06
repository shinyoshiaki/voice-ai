import { RPC } from "./base";

export interface Speaking extends RPC {
  type: "speaking";
}

export interface Waiting extends RPC {
  type: "waiting";
}

export interface Thinking extends RPC {
  type: "thinking";
}
export interface Response extends RPC {
  type: "response";
  payload: {
    role: "user" | "assistant";
    content: string;
    index: number;
  };
}

export type AssistantFunctions = Speaking | Waiting | Thinking | Response;
