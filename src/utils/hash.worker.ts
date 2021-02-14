import registerPromiseWorker from 'promise-worker/register';
import CryptoJS from 'crypto-js';

registerPromiseWorker(({ file }) => {
    const algo = CryptoJS.algo.SHA256.create();
    const chunkSize = 20 * 1024 * 1024;
    let promise = Promise.resolve();
    for (let index = 0; index < file.size; index += chunkSize) {
        promise = promise.then(() => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e): void => {
                    if (!e.target || !e.target.result) return reject(e);
                    const i8a = new Uint8Array(e.target.result as ArrayBuffer);
                    const a = [];
                    for (let i = 0; i < i8a.length; i += 4) {
                        a.push(i8a[i] << 24 | i8a[i + 1] << 16 | i8a[i + 2] << 8 | i8a[i + 3]);
                    }
                    const wordArray = CryptoJS.lib.WordArray.create(a, i8a.length);
                    algo.update(wordArray);
                    resolve();
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(file.slice(index, index + chunkSize));
            });
        });
    }
    return promise.then(() => `sha256:${algo.finalize().toString()}`);
});

export default {} as typeof Worker & { new(): Worker };