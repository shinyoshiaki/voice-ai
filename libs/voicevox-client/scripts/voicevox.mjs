import { $ } from "zx/core";

await $`docker pull voicevox/voicevox_engine:cpu-ubuntu20.04-latest`;
await $`docker run --rm -it -p '127.0.0.1:50021:50021' voicevox/voicevox_engine:cpu-ubuntu20.04-latest`;
