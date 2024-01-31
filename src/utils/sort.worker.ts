import registerPromiseWorker from 'promise-worker/register';
import { FileItem } from '@/utils/types';

interface Message {
  displayList: FileItem[];
  listSortBy: string | string[] | undefined;
  listSortDesc: boolean | boolean[] | undefined;
  itemName: string;
  type: string;
}

registerPromiseWorker(({ displayList, listSortBy, listSortDesc, itemName, type }: Message) => {
  let sortBy!: string | undefined, sortDesc!: number;
  let sortedList!: FileItem[];
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
      sortedList = displayList.sort(
        (a, b): number => ((b.uploadTime as number) - (a.uploadTime as number)) * sortDesc
      );
      break;
    }
    default: {
      sortedList = displayList;
    }
  }
  if (type === 'image') {
    const items = sortedList.filter(e =>
      /\.(jpg|png|gif|bmp|webp|ico)$/.test(e.name.toLowerCase())
    );
    return {
      items: items.map(({ name, digest, start, end }) => ({
        name,
        digest,
        start,
        end
      })),
      index: items.findIndex(e => e.name === itemName)
    };
  } else if (type === 'audio') {
    const items = sortedList.filter(e => /\.(mp3|ogg|wav|flac|aac)$/.test(e.name.toLowerCase()));
    const cover =
      sortedList.find(e => /^cover\.(jpg|png|gif|bmp|webp|ico)$/.test(e.name.toLowerCase()))
        ?.digest ?? '';
    return {
      items: items.map((e, i) => ({
        id: i,
        name: e.name,
        digest: e.digest as string,
        cover
      })),
      index: items.findIndex(e => e.name === itemName)
    };
  }
});

export default {} as typeof Worker & { new (): Worker };
