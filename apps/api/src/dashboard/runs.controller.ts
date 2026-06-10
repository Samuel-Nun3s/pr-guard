import { Controller, Get, Param, Res, Sse } from '@nestjs/common';
import { Response } from 'express';
import { Observable, Subject } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

@Controller('runs')
export class RunsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll() {
    return this.prisma.reviewRun.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prisma.reviewRun.findUniqueOrThrow({
      where: { id },
      include: { comments: true, events: true },
    });
  }

  @Sse(':id/events')
  events(@Param('id') id: string): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    this.prisma.reviewEvent
      .findMany({ where: { runId: id }, orderBy: { createdAt: 'asc' } })
      .then((events) => {
        events.forEach((e) => subject.next({ data: e } as MessageEvent));
        subject.complete();
      });

    return subject.asObservable();
  }
}
