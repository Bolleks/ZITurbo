const HISTORY_KEY = 'image-generator-history';
const MAX_HISTORY = 5;

export function getHistory() {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveToHistory({ prompt, imageUrl, aspectRatio, timestamp }) {
  try {
    const history = getHistory();
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      prompt,
      imageUrl,
      aspectRatio,
      timestamp: timestamp || Date.now()
    };
    history.unshift(entry);
    // Ограничиваем количество записей
    if (history.length > MAX_HISTORY) {
      history.length = MAX_HISTORY;
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    return entry;
  } catch (err) {
    console.error('Ошибка при сохранении в историю:', err);
    return null;
  }
}

export function removeFromHistory(id) {
  try {
    const history = getHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (err) {
    console.error('Ошибка при удалении из истории:', err);
    return null;
  }
}

export function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
    return [];
  } catch (err) {
    console.error('Ошибка при очистке истории:', err);
    return null;
  }
}

export function formatTimestamp(ts) {
  const date = new Date(ts);
  const now = new Date();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Только что';
  if (minutes < 60) return `${minutes} мин. назад`;
  if (hours < 24) return `${hours} ч. назад`;
  if (days < 7) return `${days} дн. назад`;

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}
