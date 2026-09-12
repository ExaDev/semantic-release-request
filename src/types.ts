/**
 * Configuration accepted under this plugin's own entry in a semantic-release `plugins` array.
 */
export interface PluginConfig {
  /**
   * Files to stage into the release commit, relative to the project root. Defaults to `["CHANGELOG.md", "package.json"]`, matching `@semantic-release/git`'s own default.
   */
  readonly assets?: readonly string[];
  /**
   * The branch the release commit is pushed to and a pull request opened from. `${version}` is replaced with `nextRelease.version`. Defaults to `"release/${version}"`.
   */
  readonly branch?: string;
  /**
   * The release commit's message, and the pull request's title. `${version}` and `${notes}` are replaced with `nextRelease.version` and `nextRelease.notes`. Defaults to `"chore(release): ${version} [skip ci]"`.
   */
  readonly commitMessage?: string;
  /**
   * Labels applied to a newly-opened pull request. Never removed from an already-open one.
   */
  readonly labels?: readonly string[];
}

/**
 * The subset of a semantic-release plugin's own `pluginConfig`/`context` parameters this plugin reads. Narrower than semantic-release's own (untyped) `Context`, since this plugin only ever uses these fields -- see semantic-release's own plugin documentation for the full shape a real invocation provides.
 */
export interface PrepareContext {
  readonly cwd: string;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly branch: { readonly name: string };
  readonly nextRelease: { readonly version: string; readonly notes: string };
  readonly options: { readonly repositoryUrl: string };
  readonly logger: { readonly log: (message: string) => void };
}
