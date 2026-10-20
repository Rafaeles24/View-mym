export function getExtension(url: string): string {
  const cleanedUrl = url.split('?')[0].split('#')[0];
  return cleanedUrl.split('.').pop()?.toLowerCase() ?? '';
}