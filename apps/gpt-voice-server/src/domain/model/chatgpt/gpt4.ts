import { ChatGpt } from "./base";

export class Gpt4 extends ChatGpt {
  static readonly modelName: string = "gpt-4";
  constructor() {
    super({ modelName: Gpt4.modelName });
  }
}
