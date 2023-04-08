import { writeFile } from "fs/promises";
import { VoicevoxClient } from "../../src/client";

(async () => {
  const client = new VoicevoxClient();
  const res = await client.speak("おはよう");
  await writeFile("./a.wav", res);
})();
