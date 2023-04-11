export const env = {
  modelPath: __dirname + "/vosk-model",
  voiceServer: { port: 8888 },
  endpoint: "ws://localhost:8888",
};
export type Env = typeof env;
