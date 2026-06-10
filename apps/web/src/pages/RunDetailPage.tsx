import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PipelineEvent } from '@pr-guard/shared';
import PipelineView from '../features/pipeline/PipelineView';

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [events, setEvents] = useState<PipelineEvent[]>([]);

  useEffect(() => {
    if (!id) return;
    const es = new EventSource(`/api/runs/${id}/events`);
    es.onmessage = (e) => setEvents((prev) => [...prev, JSON.parse(e.data) as PipelineEvent]);
    return () => es.close();
  }, [id]);

  return (
    <div>
      <h1>Review #{id}</h1>
      <PipelineView events={events} />
    </div>
  );
}
