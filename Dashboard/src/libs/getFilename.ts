export function getFileName(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop() ?? 'archivo';

    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  } catch (error) {
    return url.split('/').pop() ?? 'archivo';
  }
}