import { IndexStatus } from '../types';
import { writeTextFile, readTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { appConfigDir, join } from '@tauri-apps/api/path';

const LS_KEY = 'lunary.indexStatus';

export async function saveIndexStatus(status: IndexStatus) {
  try {
    const base = await appConfigDir();
    const folder = await join(base, 'indexes', 'default');
    const meta = await join(folder, 'meta.json');
    if (!(await exists(folder))) {
      await mkdir(folder, { recursive: true });
    }
    await writeTextFile(meta, JSON.stringify(status));
  } catch {
    localStorage.setItem(LS_KEY, JSON.stringify(status));
  }
}

export async function loadIndexStatus(): Promise<IndexStatus | null> {
  try {
    const base = await appConfigDir();
    const meta = await join(base, 'indexes', 'default', 'meta.json');
    const content = await readTextFile(meta);
    return JSON.parse(content) as IndexStatus;
  } catch {
    const ls = localStorage.getItem(LS_KEY);
    return ls ? (JSON.parse(ls) as IndexStatus) : null;
  }
}

