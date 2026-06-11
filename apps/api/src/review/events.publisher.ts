import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventBus } from './event.bus';

export type PipelineStep =
  | 'webhook_received'
  | 'queued'
  | 'diff_loaded'
  | 'reviewing_file'
  | 'comments_posted'
  | 'completed'
  | 'failed';

@Injectable()
export class EventsPublisher {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
  ) {}

  async publish(runId: string, step: PipelineStep, payload?: Record<string, unknown>) {
    const event = await this.prisma.reviewEvent.create({
      data: { runId, step, payload: (payload ?? {}) as Prisma.InputJsonValue },
    });

    this.eventBus.emit(runId, event);

    if (step === 'completed' || step === 'failed') {
      this.eventBus.complete(runId);
    }
  }
}
