import registerPromiseWorker from 'promise-worker/register';
import { FileItem } from '@/utils/types';

interface Message {
  displayListString: string;
  listSortBy: string | string[] | undefined;
  listSortDesc: boolean | boolean[] | undefined;
  searchText: string | undefined;
  itemName: string;
}

registerPromiseWorker(({ displayListString, listSortBy, listSortDesc, searchText, itemName }: Message) => {
  let sortBy!: string | undefined, sortDesc!: number;
  let sortedList!: FileItem[];
  const displayList: FileItem[] = JSON.parse(displayListString);
  if (Array.isArray(listSortBy)) sortBy = listSortBy[0];
  else sortBy = listSortBy;
  if (Array.isArray(listSortDesc)) sortDesc = listSortDesc[0] ? 1 : -1;
  else sortDesc = listSortDesc ? 1 : -1;
  switch (sortBy) {
    case 'name': {
      sortedList = displayList.sort((a, b): number => {
        if (a.name.localeCompare(b.name) < 0) return sortDesc;
        else return -sortDesc;
      });
      break;
    }
    case 'uploadTime': {
      sortedList = displayList.sort((a, b): number =>
        ((b.uploadTime as number) - (a.uploadTime as number)) * sortDesc
      );
      break;
    }
    default: {
      sortedList = displayList;
    }
  }
  if (searchText) sortedList = sortedList.filter(e => e.name.includes(searchText));
  const images = sortedList.filter(e => /\.(jpg|png|gif|bmp|webp|ico)$/.test(e.name));
  return { images: images.map(e => ({ name: e.name, digest: e.digest as string })), index: images.findIndex(e => e.name === itemName) };
});

export default {} as typeof Worker & { new(): Worker };