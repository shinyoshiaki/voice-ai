import { UserSessionRepository } from "./domain/session/sessionRepository";
import { CallUsecase } from "./usecase/call";

const callSessionRepository = new UserSessionRepository();
export const callUsecase = new CallUsecase(callSessionRepository);
