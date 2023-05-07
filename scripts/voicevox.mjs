import { $ } from "zx/core";

const image = "voicevox/voicevox_engine:cpu-ubuntu20.04-latest";
const VV_CPU_NUM_THREADS = 12 - 1;

await $`docker pull ${image}`;

for (;;) {
  try {
    await $`docker run -e VV_CPU_NUM_THREADS=${VV_CPU_NUM_THREADS} --rm -it -p '127.0.0.1:50021:50021' ${image}`;
    break;
  } catch (error) {
    console.error(error);
  }
}
