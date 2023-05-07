import { Audio2Rtp } from "../../../../libs/audio2rtp/src";
import { VoicevoxClient } from "../../../../libs/voicevox-client/src";
import { OrderedPromiseExecutor } from "../util";

const voicevox = new VoicevoxClient();

export class TtsSession {
  private emotion = { neutral: 23, happy: 24, angry: 26, sad: 25, relaxed: 23 };
  private latestSpeaker = this.emotion.neutral;
  private executor = new OrderedPromiseExecutor();

  constructor(private audio2Rtp: Audio2Rtp) {}

  private removeEmotionTags(text: string) {
    const regex = /\[.*?\]/g;
    return text.replace(regex, "");
  }

  private getEmotionTags(text: string) {
    const regex = /\[.*?\]/g;
    return (text.match(regex) ?? ["[]"])[0].slice(1, -1);
  }

  async speak(sentence: string) {
    if (!sentence) {
      await this.executor.push(async () => {});
      await this.audio2Rtp.inputWav();
      return;
    }

    const emotionTag = this.getEmotionTags(sentence);
    let speaker = this.emotion[emotionTag];
    if (speaker) {
      this.latestSpeaker = speaker;
    }
    speaker = speaker ?? this.latestSpeaker;

    sentence = this.removeEmotionTags(sentence);

    const wav = await this.executor.push(() =>
      voicevox.speak(sentence, { speaker })
    );
    await this.audio2Rtp.inputWav(wav);
  }
}
