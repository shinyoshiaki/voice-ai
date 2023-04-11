import { env } from "../../../env";
import { credentials } from "../../../cred";

export const config = {
  openai: credentials.openai,
  modelPath: env.modelPath,
  port: env.voiceServer.port,
};
