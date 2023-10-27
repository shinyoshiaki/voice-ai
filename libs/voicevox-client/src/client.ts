import axios from "axios";

export class VoicevoxClient {
  readonly http = axios.create({ baseURL: "http://localhost:50021" });

  constructor(
    private props: {
      speaker?: number;
      speedScale?: number;
      logging?: boolean;
    } = {}
  ) {
    props.speaker = props.speaker ?? 1;
    props.speedScale = props.speedScale ?? 1.5;
  }

  async speak(text: string, props: { speaker?: number } = {}) {
    props.speaker = props.speaker ?? this.props.speaker;

    if (this.props.logging) {
      console.log("speak:" + text);
      console.time("speak:" + text);
    }
    const query = await this.http.post(
      `/audio_query?speaker=${props.speaker}&text="${text}"`
    );
    const res = await this.http.post(
      `/synthesis?speaker=${props.speaker}`,
      { ...query.data, speedScale: this.props.speedScale },
      {
        responseType: "arraybuffer",
      }
    );
    if (this.props.logging) {
      console.timeEnd("speak:" + text);
    }
    return Buffer.from(res.data);
  }
}
