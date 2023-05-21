import { AssistantModel } from "./base";
import { Browser } from "./browser";
import { Gpt3 } from "./chatgpt/gpt3";
import { Gpt4 } from "./chatgpt/gpt4";

export async function assistantModelFactory(
  model: string
): Promise<AssistantModel> {
  switch (model) {
    case Gpt3.modelName:
      return new Gpt3();
    case Gpt4.modelName:
      return new Gpt4();
    case Browser.modelName: {
      const browser = new Browser();
      await browser.setup();
      return browser;
    }
    default:
      throw new Error(`Unknown model: ${model}`);
  }
}

export const models = [Gpt3.modelName, Gpt4.modelName, Browser.modelName];
