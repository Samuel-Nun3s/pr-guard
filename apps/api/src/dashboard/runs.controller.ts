import { Controller, Get, Param, Sse } from '@nestjs/common';
import { Observable, merge, from } from 'rxjs';
import { map, concatMap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import { EventBus } from '../review/event.bus';

@Controller('runs')
export class RunsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
  ) {}

  @Get()
  findAll() {
    return this.prisma.reviewRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { repository: { select: { owner: true, name: true } } },
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prisma.reviewRun.findUniqueOrThrow({
      where: { id },
      include: {
        repository: { select: { owner: true, name: true } },
        comments: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  @Sse(':id/events')
  events(@Param('id') id: string): Observable<MessageEvent> {
    // Emit all historical events first, then stream live events until completed/failed
    const historical$ = from(
      this.prisma.reviewEvent.findMany({
        where: { runId: id },
        orderBy: { createdAt: 'asc' },
      }),
    ).pipe(concatMap((events) => from(events)));

    const live$ = this.eventBus.getOrCreate(id).asObservable();

    return merge(historical$, live$).pipe(
      map((event) => ({ data: event } as MessageEvent)),
    );
  }
}
