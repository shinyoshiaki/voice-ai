import { RPC } from "./base";

export interface ClearHistory extends RPC {
  type: "clearHistory";
}

export interface CancelQuestion extends RPC {
  type: "cancelQuestion";
}

export interface ChangeModel extends RPC {
  type: "changeModel";
  payload: { model: string };
}

export type ChatFunctions = ClearHistory | CancelQuestion | ChangeModel;
