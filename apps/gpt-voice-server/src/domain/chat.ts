export class ChatLog {
  index = 0;
  content = "";

  end(content: string) {
    this.content = "";
    return { content, index: this.index++ };
  }

  put(content: string) {
    this.content += content;
    return { content: this.content, index: this.index };
  }

  post(content: string) {
    return { content, index: this.index };
  }
}
