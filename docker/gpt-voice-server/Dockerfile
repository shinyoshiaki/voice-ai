FROM ubuntu:latest

RUN apt-get update
RUN apt-get -y install curl build-essential
RUN apt-get -y install gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly
RUN apt-get -y install ffmpeg
RUN curl -sL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get -y install nodejs

WORKDIR /local

COPY ./apps/gpt-voice-server /local/apps/gpt-voice-server
COPY ./libs /local/libs
COPY package*.json /local/
COPY cred.*ts /local/
COPY vosk-model /local/vosk-model

RUN npm i

WORKDIR /local/apps/gpt-voice-server

EXPOSE 8080


CMD ["npm","run", "dev"]
