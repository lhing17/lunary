import { AppSettings } from '../types';
import { writeTextFile, readTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { appConfigDir, join } from '@tauri-apps/api/path';

const LS_KEY = 'lunary.settings';

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
  } catch {
    const ls = localStorage.getItem(LS_KEY);
    return ls ? (JSON.parse(ls) as AppSettings) : null;
  }
}
