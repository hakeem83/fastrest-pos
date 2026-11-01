// Lightweight Google Drive sync helper for offline-first POS
let isConnected = false;

export function initDriveAuth(
  onConnected: () => void,
  onDisconnected: () => void
): () => void {
  const saved = localStorage.getItem('fastrest_drive_connected');
  if (saved === 'true') {
    isConnected = true;
    onConnected();
  } else {
    onDisconnected();
  }
  return () => {};
}

export function isDriveConnected(): boolean {
  return isConnected;
}
