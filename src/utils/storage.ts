import { Repository } from '@/utils/types';
import { buildAsExtension } from '@/build-type.json';

interface Aria2Config {
  address: string;
  secret: string;
}

interface DatabaseToken {
  token: string;
  expiration: number;
}

export default {
  // eslint-disable-next-line
  async setValue(key: string, value: any): Promise<void> {
    if (buildAsExtension && chrome?.storage) {
      await chrome.storage.local.set({ [key]: value });
    }
    else localStorage.setItem(key, JSON.stringify(value));
  },
  // eslint-disable-next-line
  async getValue(key: string): Promise<any> {
    if (buildAsExtension && chrome?.storage)
      return new Promise((res) => {
        chrome.storage.local.get([key], result => res(result));
      });
    else {
      const value = localStorage.getItem(key);
      if (value !== null) return { [key]: JSON.parse(value) };
      else return {};
    }
  },
  async getTheme(): Promise<string> {
    const { theme = 'browser' } = await this.getValue('theme');
    return theme;
  },
  async getRepositories(): Promise<Repository[]> {
    if (buildAsExtension) {
      const { repositories = [] } = await this.getValue('repositories');
      return repositories;
    }
    else return [{ id: 1, name: 'anime', url: '', secret: '' }, { id: 2, name: 'music', url: '', secret: '' }];
  },
  async getActiveID(): Promise<number> {
    const { active = 0 } = await this.getValue('active');
    if (buildAsExtension || active) {
      return active;
    }
    else return 1;
  },
  async getAria2Config(): Promise<Aria2Config | undefined> {
    const { aria2 } = await this.getValue('aria2');
    return aria2;
  },
  async getRepositoryToken(id: number): Promise<string | undefined> {
    const { [`repositoryToken_${id}`]: token } = await this.getValue(`repositoryToken_${id}`);
    return token;
  },
  async setRepositoryToken(id: number, token: string): Promise<void> {
    await this.setValue(`repositoryToken_${id}`, token);
  },
  async getDatabaseToken(id: number): Promise<DatabaseToken | undefined> {
    const { [`databaseToken_${id}`]: token } = await this.getValue(`databaseToken_${id}`);
    return token;
  },
  async setDatabaseToken(id: number, token: DatabaseToken): Promise<void> {
    await this.setValue(`databaseToken_${id}`, token);
  }
};