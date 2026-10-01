import { describe, expect, it } from "vitest";
import { deferPastDragStart } from "@/components/subjects/tree/use-subject-drag-and-drop";

class FakeTaskQueue {
  private readonly tasks: Array<() => void> = [];

  readonly schedule = (callback: () => void): void => {
    this.tasks.push(callback);
  };

  flush(): void {
    for (const task of this.tasks.splice(0)) {
      task();
    }
  }
}

describe("deferPastDragStart", () => {
  it("does not commit drag state synchronously inside dragstart", () => {
    const queue = new FakeTaskQueue();
    const commits: string[] = [];

    deferPastDragStart(() => commits.push("subject-1"), queue.schedule);

    expect(commits).toEqual([]);
    queue.flush();
    expect(commits).toEqual(["subject-1"]);
  });
});
