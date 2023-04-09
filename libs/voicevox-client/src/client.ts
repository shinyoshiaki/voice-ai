import axios from "axios";

export class VoicevoxClient {
  readonly http = axios.create({ baseURL: "http://localhost:50021" });

  async speak(text: string) {
    const query = await this.http.post(`/audio_query?speaker=1&text="${text}"`);
    const res = await this.http.post(
      `/synthesis?speaker=1`,
      { ...query.data, speedScale: 2 },
      {
        responseType: "arraybuffer",
      }
    );
    return Buffer.from(res.data);
  }
}
