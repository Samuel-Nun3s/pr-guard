import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class EventBus {
  private readonly subjects = new Map<string, Subject<object>>();

  getOrCreate(runId: string): Subject<object> {
    if (!this.subjects.has(runId)) {
      this.subjects.set(runId, new Subject());
    }
    return this.subjects.get(runId)!;
  }

  emit(runId: string, data: object): void {
    this.subjects.get(runId)?.next(data);
  }

  complete(runId: string): void {
    const subject = this.subjects.get(runId);
    if (subject) {
      subject.complete();
      this.subjects.delete(runId);
    }
  }
}
