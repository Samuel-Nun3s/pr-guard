import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PipelineView from '../PipelineView';

const noEvents: Array<{ step: string; payload?: Record<string, unknown> }> = [];

describe('PipelineView', () => {
  it('renders all pipeline steps', () => {
    render(<PipelineView events={noEvents} />);
    expect(screen.getByText('Queued')).toBeTruthy();
    expect(screen.getByText('Diff loaded')).toBeTruthy();
    expect(screen.getByText('Reviewing files')).toBeTruthy();
    expect(screen.getByText('Comments posted')).toBeTruthy();
    expect(screen.getByText('Completed')).toBeTruthy();
  });

  it('shows checkmarks for completed steps', () => {
    const events = [
      { step: 'queued' },
      { step: 'diff_loaded' },
    ];
    const { container } = render(<PipelineView events={events} />);
    const checkmarks = container.querySelectorAll('li');
    // First two steps have ✓
    expect(checkmarks[0].textContent).toContain('✓');
    expect(checkmarks[1].textContent).toContain('✓');
    // Third step is not yet done
    expect(checkmarks[2].textContent).not.toContain('✓');
  });

  it('shows reviewing file info when reviewing_file event is present', () => {
    const events = [
      { step: 'queued' },
      { step: 'diff_loaded' },
      { step: 'reviewing_file', payload: { file: 'src/auth.ts', index: 1, total: 3 } },
    ];
    render(<PipelineView events={events} status="RUNNING" />);
    expect(screen.getByText(/src\/auth\.ts/)).toBeTruthy();
    expect(screen.getByText(/1\/3/)).toBeTruthy();
  });

  it('shows all checkmarks when completed', () => {
    const events = [
      { step: 'queued' },
      { step: 'diff_loaded' },
      { step: 'reviewing_file', payload: { file: 'a.ts', index: 1, total: 1 } },
      { step: 'comments_posted' },
      { step: 'completed' },
    ];
    const { container } = render(<PipelineView events={events} status="COMPLETED" />);
    const checkmarks = container.querySelectorAll('li');
    checkmarks.forEach((li) => expect(li.textContent).toContain('✓'));
  });

  it('shows error indicator when status is FAILED', () => {
    const events = [{ step: 'queued' }, { step: 'diff_loaded' }];
    const { container } = render(<PipelineView events={events} status="FAILED" />);
    expect(container.textContent).toContain('✕');
  });
});
