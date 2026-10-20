export type UploadStatus = | {
  type: 'idle';
  message: "";
} | {
  type: 'uploading';
  message: string;
} | {
  type: 'success';
  message: string;
} | {
  type: 'error';
  message: string;
}