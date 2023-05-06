import { SessionServiceManager } from "./application/sessionServiceManager";
import { CallUsecase } from "./application/call";
import { AssistantUsecase } from "./application/assistant";
import { UserUsecase } from "./application/user";

const userServiceManager = new SessionServiceManager();
export const callUsecase = new CallUsecase(userServiceManager);
export const assistantUsecase = new AssistantUsecase();
export const userUsecase = new UserUsecase();
