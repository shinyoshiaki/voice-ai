import { Audio2Rtp } from "../../../../libs/audio2rtp/src";
import { VoicevoxClient } from "../../../../libs/voicevox-client/src";

const voicevox = new VoicevoxClient();

export class TtsSession {
  private emotion = { neutral: 23, happy: 24, angry: 26, sad: 25, relaxed: 23 };
  private latestSpeaker = this.emotion.neutral;

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
    const emotionTag = this.getEmotionTags(sentence);
    const speaker = this.emotion[emotionTag];
    if (speaker) {
      this.latestSpeaker = speaker;
    }

    sentence = this.removeEmotionTags(sentence);

    const wav = await voicevox.speak(sentence, {
      speaker: speaker ?? this.latestSpeaker,
    });
    await this.audio2Rtp.inputWav(wav);
  }
}
