import { Injectable } from '@nestjs/common';
import { DiffParser } from '../github/diff.parser';

export interface FormattedComment {
  path: string;
  line: number;
  body: string;
}

type Severity = 'error' | 'warning' | 'suggestion';

const SEVERITY_LABEL: Record<Severity, string> = {
  error: '🔴 Error',
  warning: '🟡 Warning',
  suggestion: '🔵 Suggestion',
};

@Injectable()
export class CommentFormatter {
  constructor(private readonly diffParser: DiffParser) {}

  format(
    filename: string,
    comments: Array<{ line: number; severity: Severity; body: string }>,
    addedLines: Set<number>,
  ): FormattedComment[] {
    return comments.map((c) => ({
      path: filename,
      line: this.diffParser.clampToValidLine(c.line, addedLines),
      body: `**[${SEVERITY_LABEL[c.severity]}]** ${c.body}`,
    }));
  }
}
