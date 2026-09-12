/**
 * The `{owner, repo}` GitHub coordinates a repository URL resolves to, or `undefined` if the URL isn't a recognisable GitHub remote. Accepts every form semantic-release itself may hand a plugin as `context.options.repositoryUrl`: `https://github.com/owner/repo.git`, the same without `.git`, `git+https://github.com/owner/repo.git`, and the SSH forms `git@github.com:owner/repo.git` and `ssh://git@github.com/owner/repo.git`.
 */
export interface RepositoryCoordinates {
  readonly owner: string;
  readonly repo: string;
}

const REPOSITORY_URL_PATTERNS: readonly RegExp[] = [
  /^(?:git\+)?https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/,
  /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/,
  /^ssh:\/\/git@github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/,
];

export function parseRepositoryUrl(repositoryUrl: string): RepositoryCoordinates | undefined {
  for (const pattern of REPOSITORY_URL_PATTERNS) {
    const match = pattern.exec(repositoryUrl);
    if (match !== null) {
      const [, owner, repo] = match;
      if (owner !== undefined && repo !== undefined) {
        return { owner, repo };
      }
    }
  }
  return undefined;
}
