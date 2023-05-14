import { AssistantModel } from "./base";
import { Gpt3 } from "./chatgpt/gpt3";
import { Gpt4 } from "./chatgpt/gpt4";

export function assistantModelFactory(model: string): AssistantModel {
  switch (model) {
    case Gpt3.modelName:
      return new Gpt3();
    case Gpt4.modelName:
      return new Gpt4();
    default:
      throw new Error(`Unknown model: ${model}`);
  }
}

export const models = [Gpt3.modelName, Gpt4.modelName];
