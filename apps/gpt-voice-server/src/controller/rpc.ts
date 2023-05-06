import { ChatFunctions } from "../../../../libs/gpt-voice-rpc/src";
import { CallConnection } from "../domain/connection";
import { AssistantUsecase } from "../usecase/assistant";

export function rpcController(
  connection: CallConnection,
  assistantUsecase: AssistantUsecase
) {
  const { unSubscribe } = connection.onMessage.subscribe(async (s) => {
    const { type } = JSON.parse(s as string) as ChatFunctions;
    switch (type) {
      case "clearHistory":
        {
          assistantUsecase.clearHistory();
        }
        break;
      case "cancel":
        {
          await assistantUsecase.cancel();
        }
        break;
    }
  });
  return unSubscribe;
}
