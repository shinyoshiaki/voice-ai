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

export interface SetRecognizePaused extends RPC {
  type: "setRecognizePaused";
  payload: { paused: boolean };
}

export type ChatFunctions =
  | ClearHistory
  | CancelQuestion
  | SetRecognizePaused
  | ChangeModel;
