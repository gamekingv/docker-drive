interface Repository {
    name: string;
    url: string;
    id: number;
    token: string;
    secret: string;
}

interface FileItem {
    name: string;
    type: string;
    files?: FileItem[];
    digest?: string;
    size?: number;
    uploadTime?: number;
    id: symbol;
}

interface Manifest {
    mediaType: string;
    size: number;
    digest: string;
}

interface PathNode {
    name: string;
    disabled: boolean;
    id: symbol;
}

interface VForm extends HTMLFormElement {
    validate(): boolean;
    resetValidation(): void;
}

export {
    Repository,
    FileItem,
    Manifest,
    PathNode,
    VForm
};