import { RPC } from "./base";

export interface ClearHistory extends RPC {
  type: "clearHistory";
}

export interface Cancel extends RPC {
  type: "cancel";
}

export type ChatFunctions = ClearHistory | Cancel;
