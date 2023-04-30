import { Audio2Rtp } from "../../../../libs/audio2rtp/src";
import { VoicevoxClient } from "../../../../libs/voicevox-client/src";

const voicevox = new VoicevoxClient();

export class TtsClient {
  emotion = { neutral: 23, happy: 24, angry: 26, sad: 25, relaxed: 24 };

  constructor(private audio2Rtp: Audio2Rtp) {}

  removeEmotionTags(text: string) {
    const regex = /\[.*?\]/g;
    return text.replace(regex, "");
  }

  getEmotionTags(text: string) {
    const regex = /\[.*?\]/g;
    return (text.match(regex) ?? ["[]"])[0].slice(1, -1);
  }

  async speak(sentence: string) {
    const emotion = this.getEmotionTags(sentence);
    sentence = this.removeEmotionTags(sentence);

    const wav = await voicevox.speak(sentence, {
      speaker: this.emotion[emotion] ?? this.emotion.neutral,
    });
    await this.audio2Rtp.inputWav(wav);
  }
}
