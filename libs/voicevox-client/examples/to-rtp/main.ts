import { Audio2Rtp } from "../../../audio2rtp/src";
import { VoicevoxClient } from "../../src";

const client = new VoicevoxClient();

(async () => {
  const audio = await Audio2Rtp.Create();
  audio.onRtp.subscribe((rtp) => {
    console.log(rtp.header.sequenceNumber, rtp.header.timestamp);
  });

  for (let i = 0; i < 10; i++) {
    const res = await client.speak("おはよう");
    await audio.inputWav(res);
    console.log("input");

    await new Promise((r) => setTimeout(r, 5000));
  }
})();
