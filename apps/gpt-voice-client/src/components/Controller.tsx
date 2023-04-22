import { ArrowForwardIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Center,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
} from "@chakra-ui/react";
import { FC, useEffect, useRef, useState } from "react";
import { BsMic, BsMicMute, BsSquare } from "react-icons/bs";
import { RxSpeakerLoud, RxSpeakerOff } from "react-icons/rx";
import { callConnection } from "../domain/call";
import { aiStateAtom } from "../state";
import { useRecoilState } from "recoil";

export const Controller: FC<{}> = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [aiState, setAiState] = useRecoilState(aiStateAtom);

  useEffect(() => {
    callConnection.onAudioStream.subscribe((stream) => {
      audioRef.current.srcObject = stream;
    });
    callConnection.onMessage.subscribe(({ type }) => {
      switch (type) {
        case "speaking":
          {
            setAiState("speaking");
          }
          break;
        case "waiting":
          {
            setAiState("waiting");
          }
          break;
      }
    });
  }, []);

  const switchMute = () => {
    if (muted) {
      callConnection.localAudio.enabled = true;
      setMuted(false);
    } else {
      callConnection.localAudio.enabled = false;
      setMuted(true);
    }
  };

  const switchSpeaker = () => {
    if (speaker) {
      audioRef.current.volume = 0;
      setSpeaker(false);
    } else {
      setSpeaker(true);
      audioRef.current.volume = 1;
    }
  };

  const stop = () => {
    callConnection.sendMessage("stop");
  };

  return (
    <Box>
      <Center p={2}>
        {aiState !== "waiting" && (
          <Button onClick={stop} leftIcon={<BsSquare />}>
            stop
          </Button>
        )}
      </Center>
      <HStack>
        <IconButton
          icon={<Icon as={muted ? BsMicMute : BsMic} />}
          aria-label="mute-unmute"
          onClick={switchMute}
        />
        <audio autoPlay ref={audioRef} />
        <IconButton
          icon={<Icon as={speaker ? RxSpeakerLoud : RxSpeakerOff} />}
          aria-label="mute-unmute"
          onClick={switchSpeaker}
        />
        <InputGroup>
          <Input placeholder="Send a message..." />
          <InputRightElement>
            <IconButton
              icon={<ArrowForwardIcon />}
              aria-label="send"
              type="submit"
            />
          </InputRightElement>
        </InputGroup>
      </HStack>
      <Box p={3} />
    </Box>
  );
};
