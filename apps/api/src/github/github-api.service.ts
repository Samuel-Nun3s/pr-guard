import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App } from '@octokit/app';
import { FormattedComment } from '../review/comment.formatter';

export interface PullRequestFile {
  filename: string;
  patch?: string;
  additions: number;
  deletions: number;
  status: string;
}

@Injectable()
export class GithubApiService {
  private readonly logger = new Logger(GithubApiService.name);
  private readonly app: App;

  constructor(private readonly config: ConfigService) {
    this.app = new App({
      appId: this.config.getOrThrow<string>('GITHUB_APP_ID'),
      privateKey: this.config.getOrThrow<string>('GITHUB_APP_PRIVATE_KEY'),
      webhooks: { secret: this.config.getOrThrow<string>('GITHUB_WEBHOOK_SECRET') },
    });
  }

  private async getInstallationOctokit(installationId: number) {
    return this.app.getInstallationOctokit(installationId);
  }

  async getPullRequestFiles(
    owner: string,
    repo: string,
    pullNumber: number,
    installationId: number,
  ): Promise<PullRequestFile[]> {
    const octokit = await this.getInstallationOctokit(installationId);
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    });
    return data as PullRequestFile[];
  }

  async postReviewComments(
    owner: string,
    repo: string,
    pullNumber: number,
    installationId: number,
    comments: FormattedComment[],
    summary: string,
    commitSha: string,
  ): Promise<void> {
    const octokit = await this.getInstallationOctokit(installationId);

    await octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews', {
      owner,
      repo,
      pull_number: pullNumber,
      commit_id: commitSha,
      event: 'COMMENT',
      body: summary,
      comments: comments.map((c) => ({
        path: c.path,
        line: c.line,
        body: c.body,
      })),
    });

    this.logger.log(`Posted ${comments.length} comments on ${owner}/${repo}#${pullNumber}`);
  }

  async getHeadCommitSha(
    owner: string,
    repo: string,
    pullNumber: number,
    installationId: number,
  ): Promise<string> {
    const octokit = await this.getInstallationOctokit(installationId);
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
      owner,
      repo,
      pull_number: pullNumber,
    });
    return data.head.sha;
  }
}
