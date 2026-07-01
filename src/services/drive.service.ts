import { AppError } from '../lib/AppError.ts';

export class DriveService {
  async listFiles(token: string, folderId = 'root') {
    const parentQuery = `'${folderId}' in parents`;
    const mimeQuery = "(mimeType = 'application/pdf' or mimeType = 'text/plain' or mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/vnd.google-apps.folder')";
    const queryStr = `${parentQuery} and ${mimeQuery} and trashed = false`;
    const q = encodeURIComponent(queryStr);
    const fields = encodeURIComponent('files(id,name,mimeType,createdTime,size,parents)');
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=100`;

    const response = await fetch(url, {
      headers: { Authorization: token },
    });

    if (!response.ok) {
      throw new AppError(response.status, 'Google Drive list failed', {
        details: await response.text(),
      });
    }

    const data = await response.json();
    return data.files || [];
  }

  async createFolder(token: string, input: { name: string; parentId?: string }) {
    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: input.name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: input.parentId ? [input.parentId] : undefined,
      }),
    });

    if (!response.ok) {
      throw new AppError(response.status, 'Google Drive folder creation failed', {
        details: await response.text(),
      });
    }

    return response.json();
  }

  async uploadText(token: string, input: {
    name: string;
    content: string;
    mimeType?: string;
    parentId?: string;
  }) {
    const metadata = {
      name: input.name,
      mimeType: input.mimeType || 'text/plain',
      parents: input.parentId ? [input.parentId] : undefined,
    };

    const boundary = 'hemp_os_boundary';
    const body =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${metadata.mimeType}\r\n\r\n` +
      `${input.content}\r\n` +
      `--${boundary}--`;

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    if (!response.ok) {
      throw new AppError(response.status, 'Google Drive upload failed', {
        details: await response.text(),
      });
    }

    return response.json();
  }
}
