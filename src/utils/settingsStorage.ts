import { AppSettings } from '../types';
import { writeTextFile, readTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { appConfigDir, join } from '@tauri-apps/api/path';

/* 这里的key仅用于localStorage存储 */
const LS_KEY = 'lunary.settings';

/* 优先存储到本地磁盘文件中，如果没有权限，则存储到localStorage （一般是浏览器直接访问的情况）*/
export async function saveSettings(settings: AppSettings) {
  try {
    const dir = await appConfigDir();
    const filePath = await join(dir, 'settings.json');
    if (!(await exists(dir))) {
      await mkdir(dir, { recursive: true });
    }
    await writeTextFile(filePath, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings:', e);
    localStorage.setItem(LS_KEY, JSON.stringify(settings));
  }
}

export async function loadSettings(): Promise<AppSettings | null> {
  try {
    const dir = await appConfigDir();
    const filePath = await join(dir, 'settings.json');
    const content = await readTextFile(filePath);
    return JSON.parse(content) as AppSettings;
  } catch (e) {
    console.error('Error loading settings:', e);
    const ls = localStorage.getItem(LS_KEY);
    return ls ? (JSON.parse(ls) as AppSettings) : null;
  }
}
