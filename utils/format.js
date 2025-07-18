export const secondsToMinutes = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  export const getQueueType = (queueId) => {
    switch (queueId) {
      case 420: return 'SoloQ';
      case 440: return 'Flex';
      default: return 'Autre';
    }
  };