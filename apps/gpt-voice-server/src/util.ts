import Event from "rx.mini";

export class OrderedPromiseExecutor {
  private taskIndex = 0;
  private presentTask = 0;
  private onResult = new Event<[number]>();

  async push<T = any>(task: () => Promise<T>) {
    const taskIndex = this.taskIndex++;
    const result = await task();

    if (taskIndex !== this.presentTask) {
      await this.onResult.watch((presentTask) => presentTask === taskIndex);
    }

    this.presentTask++;
    setTimeout(() => this.onResult.execute(this.presentTask));
    return result;
  }
}
