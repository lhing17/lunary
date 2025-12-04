import { DirectoryConfig } from '../types';
import { writeTextFile, readTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { appConfigDir, join } from '@tauri-apps/api/path';

const LS_KEY = 'lunary.directories';

export async function saveDirectories(dirs: DirectoryConfig[]) {
  try {
    const dir = await appConfigDir();
    const filePath = await join(dir, 'directories.json');
    if (!(await exists(dir))) {
      await mkdir(dir, { recursive: true });
    }
    await writeTextFile(filePath, JSON.stringify(dirs));
  } catch {
    localStorage.setItem(LS_KEY, JSON.stringify(dirs));
  }
}

export async function loadDirectories(): Promise<DirectoryConfig[] | null> {
  try {
    const dir = await appConfigDir();
    const filePath = await join(dir, 'directories.json');
    const content = await readTextFile(filePath);
    return JSON.parse(content) as DirectoryConfig[];
  } catch {
    const ls = localStorage.getItem(LS_KEY);
    return ls ? (JSON.parse(ls) as DirectoryConfig[]) : null;
  }
}

