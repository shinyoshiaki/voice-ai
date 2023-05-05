export const env = {
  modelPath: __dirname + "/../../vosk-model",
  voiceServer: { port: 8888 },
  endpoint: "ws://localhost:8888",
  gptModel: "gpt-4",
};
export type Env = typeof env;
