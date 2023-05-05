import { RPC } from "./base";

export interface Recognized extends RPC {
  type: "recognized";
  payload: {
    role: "user" | "assistant";
    content: string;
    index: number;
  };
}

export type UserFunctions = Recognized;
