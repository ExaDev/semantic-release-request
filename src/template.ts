/**
 * Replaces `${version}` and `${notes}` placeholders in a template string with the given values. Deliberately not a general-purpose template engine: these are the only two substitutions this plugin's own config options (`branch`, `commitMessage`) ever need.
 */
export function renderTemplate(
  template: string,
  values: { readonly version: string; readonly notes?: string },
): string {
  return template
    .replaceAll("${version}", values.version)
    .replaceAll("${notes}", values.notes ?? "");
}
