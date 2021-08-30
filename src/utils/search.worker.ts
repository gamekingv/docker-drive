import registerPromiseWorker from 'promise-worker/register';
import { FileItem, PathNode } from '@/utils/types';

function highlight(text: string, search: string): { text: string; highlight: boolean }[] {
  const index = text.search(new RegExp(`(${search})`, 'ig'));
  if (index > -1) {
    const result = [{ text: text.substring(index, index + search.length), highlight: true }];
    if (index > 0) result.unshift({ text: text.substring(0, index), highlight: false });
    result.push(...highlight(text.substring(index + search.length), search));
    return result;
  }
  else return [{ text, highlight: false }];
}

registerPromiseWorker(({ list, path, searchText, searchRecursive = false, m3u8 }:
  {
    list: FileItem;
    path: PathNode[] | string[];
    searchText: string;
    searchRecursive: boolean;
    m3u8: string;
  }) => {
  let filePointer: FileItem = list;
  let route = '';
  for (const pathNode of path) {
    const pathString = typeof pathNode === 'string' ? pathNode : pathNode.name;
    route += `/${encodeURIComponent(pathString)}`;
    const nextPointer = filePointer.files?.find(e => e.name === pathString);
    if (nextPointer?.type === 'folder') filePointer = nextPointer;
    else return;
  }
  if (m3u8) {
    const list = m3u8.replace(/\r/g, '').split('\n').filter(e => e).map(e => e.split('\\'));
    if (filePointer.files) {
      return list.map(path => {
        if (!/\.(mp3|ogg|wav|flac|aac)$/.test(path[path.length - 1])) return;
        let folderPointer = filePointer;
        let remainPath = path.length;
        for (const name of path) {
          const nextPointer = folderPointer.files?.find(e => e.name === name);
          if (!--remainPath && nextPointer?.type === 'file') {
            const cover = folderPointer.files?.find(e => /^cover\.(jpg|png|gif|bmp|webp|ico)$/.test(e.name.toLowerCase()))?.digest ?? '';
            folderPointer.files?.find(e => e.name === name);
            return { name: nextPointer.name, digest: nextPointer.digest, cover };
          }
          else if (nextPointer?.type === 'folder') folderPointer = nextPointer;
          else return;
        }
      }).filter(e => e).map((e, i) => Object.assign(e, { id: i }));
    }
  }
  else if (searchText) {
    if (searchRecursive) {
      if (filePointer.files) {
        const searchResult: FileItem[] = [];
        (function search(files: FileItem[], parent: string): void {
          for (const file of files) {
            if (file.name.toLowerCase().includes(searchText.toLowerCase())) {
              file.path = parent ?? '/';
              file.displayName = highlight(file.name, searchText);
              searchResult.push(file);
            }
            if (file.files) {
              search(file.files, `${parent}/${encodeURIComponent(file.name)}`);
            }
          }
        })(filePointer.files, route);
        searchResult.forEach(file => delete file.files);
        return searchResult;
      }
      else return;
    }
    else {
      const searchResult = filePointer.files?.filter(file => file.name.toLowerCase().includes(searchText.toLowerCase()));
      searchResult?.forEach(file => {
        file.displayName = highlight(file.name, searchText);
        delete file.files;
      });
      return searchResult;
    }
  }
  else {
    filePointer.files?.forEach(file => delete file.files);
    return filePointer.files;
  }
});

export default {} as typeof Worker & { new(): Worker };
