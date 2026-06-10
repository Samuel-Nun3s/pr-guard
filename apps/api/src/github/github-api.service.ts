import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ReviewComment {
  path: string;
  line: number;
  severity: 'error' | 'warning' | 'suggestion';
  body: string;
}

@Injectable()
export class GithubApiService {
  constructor(private readonly config: ConfigService) {}

  // Phase 1: fetch PR diff files via Octokit
  async getPullRequestFiles(_owner: string, _repo: string, _pullNumber: number) {
    throw new Error('Not implemented — Phase 1');
  }

  // Phase 2: post inline review comments
  async postReviewComments(
    _owner: string,
    _repo: string,
    _pullNumber: number,
    _comments: ReviewComment[],
  ) {
    throw new Error('Not implemented — Phase 2');
  }
}
