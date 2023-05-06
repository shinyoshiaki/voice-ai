import { UserServiceManager } from "./application/userServiceManager";
import { CallUsecase } from "./application/call";
import { AssistantUsecase } from "./application/assistant";

const userServiceManager = new UserServiceManager();
export const callUsecase = new CallUsecase(userServiceManager);
export const assistantUsecase = new AssistantUsecase();
