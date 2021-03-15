export default {
  async setValue(key: string, value: any): Promise<void> {
    return await chrome.storage.local.set({ [key]: value });
  },
  async getValue(key: string): Promise<any> {
    return new Promise((res) => {
      chrome.storage.local.get([key], result => res(result));
    });
  }
};