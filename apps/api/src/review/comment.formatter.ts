import { Injectable } from '@nestjs/common';

export interface FormattedComment {
  path: string;
  line: number;
  body: string;
}

@Injectable()
export class CommentFormatter {
  format(
    filename: string,
    comments: Array<{ line: number; severity: 'error' | 'warning' | 'suggestion'; body: string }>,
  ): FormattedComment[] {
    return comments.map((c) => ({
      path: filename,
      line: c.line,
      body: `**[${c.severity.toUpperCase()}]** ${c.body}`,
    }));
  }
}
