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
  const addZero = (n: number): string => `0${n}`.substring(`0${n}`.length - 2);
  return `${date.getFullYear()}-${addZero(date.getMonth() + 1)}-${addZero(date.getDate())} ${addZero(date.getHours())}:${addZero(date.getMinutes())}`;
}

function progressPercentage({ uploadedSize, totalSize }: { uploadedSize: number; totalSize: number }): string {
  if (totalSize === 0) return '0%';
  return `${(uploadedSize / totalSize * 100).toFixed(1)}%`;
}

function iconFormat(originalName: string): string {
  const name = originalName.toLowerCase();
  if (/.*\.(mp4|mkv|avi)$/.test(name)) return 'mdi-video-outline';
  else if (/.*\.(ass|srt|ssa|vtt)$/.test(name)) return 'mdi-closed-caption-outline';
  else if (/\.(jpe?g|png|gif|bmp|webp|ico)$/.test(name)) return 'mdi-file-image-outline';
  else if (/\.(mp3|ogg|wav|flac|aac)$/.test(name)) return 'mdi-music-box-outline';
  else if (/\.(m3u8)$/.test(name)) return 'mdi-playlist-music';
  else return 'mdi-file';
}

function iconColor(name: string): string {
  const [, ext] = name.toLowerCase().match(/.*\.([^.]*)$/) ?? [];
  switch (ext) {
    case 'mp4': return 'purple lighten-2';
    case 'mkv': return 'teal lighten-2';
    case 'avi': return 'red lighten-2';

    case 'ass': return 'red lighten-2';
    case 'srt': return 'teal lighten-2';
    case 'ssa': return 'pink lighten-2';
    case 'vtt': return 'purple lighten-2';

    case 'jpeg':
    case 'jpg': return 'red lighten-2';
    case 'png': return 'teal lighten-2';
    case 'gif': return 'pink lighten-2';
    case 'bmp': return 'purple lighten-2';
    case 'webp': return 'indigo lighten-2';
    case 'ico': return 'orange lighten-2';

    case 'mp3': return 'red lighten-2';
    case 'ogg': return 'teal lighten-2';
    case 'wav': return 'pink lighten-2';
    case 'flac': return 'purple lighten-2';
    case 'aac': return 'indigo lighten-2';

    case 'm3u8': return 'orange lighten-2';

    default: return 'mdi-file';
  }
}

export {
  sizeFormat,
  formatTime,
  progressPercentage,
  iconFormat,
  iconColor
};