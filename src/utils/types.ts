import { CancelTokenSource } from 'axios';

interface Repository {
  name: string;
  url: string;
  id: number;
  secret: string;
  useDatabase?: boolean;
  databaseURL?: string;
  databaseApiKey?: string;
}

interface FileItem {
  name: string;
  displayName?: { text: string; highlight: boolean }[];
  type: string;
  files?: FileItem[];
  digest?: string;
  size?: number;
  uploadTime?: number;
  id: number;
  _id?: string;
  uuid?: string;
  path?: string;
}

interface FolderList {
  name: string;
  files: FolderList[];
  id: string;
  disabled: boolean;
}

interface Manifest {
  mediaType: string;
  size: number;
  digest: string;
}

interface PathNode {
  name: string;
  path: string;
}

interface VForm extends HTMLFormElement {
  validate(): boolean;
  resetValidation(): void;
}

interface Config {
  files: FileItem[];
  layers: Manifest[];
}

interface DatabaseItem extends FileItem {
  _rev?: string;
}

interface Task {
  id: symbol;
  name: string;
  file: File | undefined;
  status: string;
  progress: {
    uploadedSize: number;
    totalSize: number;
  };
  speed: number;
  remainingTime: number;
  path: string[];
  lastUpdate: {
    time: number;
    size: number;
  };
  timer?: number | NodeJS.Timeout;
  cancelToken: CancelTokenSource;
  hashWorker?: Worker;
  repository: number;
  relativePath: string;
}

export {
  Repository,
  FileItem,
  FolderList,
  Manifest,
  PathNode,
  VForm,
  Config,
  DatabaseItem,
  Task
};