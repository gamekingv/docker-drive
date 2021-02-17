function sizeFormat(fileSize: number): string {
  if (typeof fileSize !== 'number') return '-';
  else if (fileSize < 1024) {
    return `${fileSize.toFixed(2)}B`;
  } else if (fileSize < (1024 * 1024)) {
    return `${(fileSize / 1024).toFixed(2)}KB`;
  } else if (fileSize < (1024 * 1024 * 1024)) {
    return `${(fileSize / (1024 * 1024)).toFixed(2)}MB`;
  } else {
    return `${(fileSize / (1024 * 1024 * 1024)).toFixed(2)}GB`;
  }
}

function formatTime(time: number): string {
  if (!time) return '-';
  const date = new Date(time);
  const addZero = (n: number): string => `0${n}`.substr(-2);
  return `${date.getFullYear()}-${addZero(date.getMonth() + 1)}-${addZero(date.getDate())} ${addZero(date.getHours())}:${addZero(date.getMinutes())}`;
}

function progressPercentage({ uploadedSize, totalSize }: { uploadedSize: number; totalSize: number }): string {
  if (totalSize === 0) return '0%';
  return `${(uploadedSize / totalSize * 100).toFixed(1)}%`;
}

function iconFormat(name: string): string {
  if (/.*\.(mp4|mkv|avi)$/.test(name)) return 'mdi-youtube';
  else return 'mdi-file';
}

export {
  sizeFormat,
  formatTime,
  progressPercentage,
  iconFormat
};