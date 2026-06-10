import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  async publish(runId: string, step: PipelineStep, payload?: Record<string, unknown>) {
    await this.prisma.reviewEvent.create({
      data: { runId, step, payload: payload ?? {} },
    });
  }
}
