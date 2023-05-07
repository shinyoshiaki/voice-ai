import { RPC } from "./base";

export interface ClearHistory extends RPC {
  type: "clearHistory";
}

export interface CancelQuestion extends RPC {
  type: "cancelQuestion";
}

export type ChatFunctions = ClearHistory | CancelQuestion;
