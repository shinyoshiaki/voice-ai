import { Audio2Rtp } from "../../../../libs/audio2rtp/src";
import { VoicevoxClient } from "../../../../libs/voicevox-client/src";

const voicevox = new VoicevoxClient();

export class TtsClient {
  constructor(private audio2Rtp: Audio2Rtp) {}

  removeEmotionTags(text: string) {
    const regex = /\[.*?\]/g;
    return text.replace(regex, "");
  }

  async speak(sentence: string) {
    sentence = this.removeEmotionTags(sentence);

    const wav = await voicevox.speak(sentence);
    await this.audio2Rtp.inputWav(wav);
  }
}
