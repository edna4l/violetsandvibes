export function getSafeRedirectPath(
  redirect: string | null,
  defaultPath = '/social'
): string {
  if (typeof redirect !== 'string') {
    return defaultPath;
  }

  if (!redirect.startsWith('/') || redirect.startsWith('//')) {
    return defaultPath;
  }

  if (redirect.startsWith('/admin')) {
    return defaultPath;
  }

  return redirect;
}
