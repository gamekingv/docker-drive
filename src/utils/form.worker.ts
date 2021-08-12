import registerPromiseWorker from 'promise-worker/register';
import { FileItem, FolderList } from '@/utils/types';

registerPromiseWorker(async ({ type, files, root, rootID = 'root' }: { type: string; files: FileItem[]; root: FileItem; rootID: string }) => {
  switch (type) {
    case 'count': {
      let fileCount = 0, folderCount = 0;
      (function getRemoveCount(items: FileItem[]): void {
        for (const item of items) {
          if (item.type === 'file') fileCount++;
          else if (item.type === 'folder') {
            folderCount++;
            getRemoveCount(item.files as FileItem[]);
          }
        }
      })(files);
      return { fileCount, folderCount };
    }
    case 'folderList': {
      const folderRoot = { name: '', files: [], id: 'root', disabled: false };
      (function filterFolder(folder: FolderList, rootFiles: FileItem, path: string): void {
        for (const file of rootFiles.files as FileItem[]) {
          if (file.type === 'folder') {
            const filterFile = { name: file.name, files: [], id: `${path}/${encodeURIComponent(file.name)}`, disabled: files.some(e => e.id === file.id) };
            if (folder.files) folder.files.push(filterFile);
            filterFolder(filterFile, file, filterFile.id);
          }
        }
        /*@ts-ignore*/
        if (folder.files.length === 0) delete folder.files;
      })(folderRoot, root, rootID);
      return folderRoot.files;
    }
  }
});

export default {} as typeof Worker & { new(): Worker };