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
    const files: PullRequestFile[] = [];
    let page = 1;

    while (true) {
      const { data } = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100,
        page,
      });
      files.push(...(data as PullRequestFile[]));
      if (data.length < 100) break;
      page++;
    }

    return files;
  }

  async postReviewComments(
    owner: string,
    repo: string,
    pullNumber: number,
    installationId: number,
    comments: FormattedComment[],
    summary: string,
    commitSha: string,
    event: 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES' = 'COMMENT',
  ): Promise<void> {
    const octokit = await this.getInstallationOctokit(installationId);

    await octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews', {
      owner,
      repo,
      pull_number: pullNumber,
      commit_id: commitSha,
      event,
      body: summary,
      comments: comments.map((c) => ({
        path: c.path,
        line: c.line,
        body: c.body,
      })),
    });

    this.logger.log(`Posted ${comments.length} comments (${event}) on ${owner}/${repo}#${pullNumber}`);
  }

  async getFileContent(
    owner: string,
    repo: string,
    filePath: string,
    installationId: number,
  ): Promise<string | null> {
    const octokit = await this.getInstallationOctokit(installationId);
    try {
      const { data } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner,
        repo,
        path: filePath,
      });
      if (Array.isArray(data) || data.type !== 'file') return null;
      return Buffer.from(data.content, 'base64').toString('utf-8');
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
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
