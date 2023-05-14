import { ChatGpt } from "./base";

export class Gpt3 extends ChatGpt {
  static readonly modelName: string = "gpt-3.5-turbo";
  constructor() {
    super({ modelName: Gpt3.modelName });
  }
}
