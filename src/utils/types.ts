interface Repository {
    name: string;
    url: string;
    value: symbol;
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

interface VForm extends Vue {
    validate(): boolean;
    reset(): void;
    resetValidation(): void;
}

export {
    Repository,
    FileItem,
    Manifest,
    VForm
};