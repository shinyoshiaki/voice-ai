import { UserService } from "../infrastructure/userService";

export class AssistantUsecase {
  clearHistory(service: UserService) {
    service.assistant.clearHistory();
  }

  async cancelQuestion(service: UserService) {
    await service.assistant.cancelSpeaking();
  }
}
