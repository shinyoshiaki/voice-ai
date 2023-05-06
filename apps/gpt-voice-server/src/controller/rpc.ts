import { ChatFunctions } from "../../../../libs/gpt-voice-rpc/src";
import { assistantUsecase } from "../bootstrap";

import { UserService } from "../infrastructure/userService";

export function rpcController(service: UserService) {
  const { unSubscribe } = service.connection.onMessage.subscribe(async (s) => {
    const { type } = JSON.parse(s as string) as ChatFunctions;
    switch (type) {
      case "clearHistory":
        {
          assistantUsecase.clearHistory(service);
        }
        break;
      case "cancelQuestion":
        {
          await assistantUsecase.cancelQuestion(service);
        }
        break;
    }
  });
  return unSubscribe;
}
