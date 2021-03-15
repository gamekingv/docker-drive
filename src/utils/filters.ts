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
  else if (/.*\.(ass|srt|ssa|vtt)$/.test(name)) return 'mdi-closed-caption';
  else if (/\.(jpg|png|gif|bmp|webp|ico)$/.test(name)) return 'mdi-file-image';
  else return 'mdi-file';
}

function iconColor(name: string): string {
  if (/.*\.(mp4)$/.test(name)) return 'purple lighten-2';
  else if (/.*\.(mkv)$/.test(name)) return 'teal lighten-2';
  else if (/.*\.(avi)$/.test(name)) return 'red lighten-2';
  else if (/.*\.(ass)$/.test(name)) return 'red lighten-2';
  else if (/.*\.(srt)$/.test(name)) return 'teal lighten-2';
  else if (/.*\.(ssa)$/.test(name)) return 'pink lighten-2';
  else if (/.*\.(vtt)$/.test(name)) return 'purple lighten-2';
  else if (/.*\.(jpg)$/.test(name)) return 'red lighten-2';
  else if (/.*\.(png)$/.test(name)) return 'teal lighten-2';
  else if (/.*\.(gif)$/.test(name)) return 'pink lighten-2';
  else if (/.*\.(bmp)$/.test(name)) return 'purple lighten-2';
  else if (/.*\.(webp)$/.test(name)) return 'indigo lighten-2';
  else if (/.*\.(ico)$/.test(name)) return 'orange lighten-2';
  else return 'mdi-file';
}

export {
  sizeFormat,
  formatTime,
  progressPercentage,
  iconFormat,
  iconColor
};