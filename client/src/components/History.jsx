import React, { useState } from 'react';
import { removeFromHistory, clearHistory, formatTimestamp } from '../utils/historyStore';

function History({ history, onSelectPrompt, onHistoryChange }) {
  const [expandedId, setExpandedId] = useState(null);

  const handleDelete = (id) => {
    const updated = removeFromHistory(id);
    if (updated !== null && onHistoryChange) {
      onHistoryChange(updated);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Вы уверены, что хотите очистить всю историю?')) {
      const updated = clearHistory();
      if (updated !== null && onHistoryChange) {
        onHistoryChange(updated);
      }
    }
  };

  const handleDownload = async (url) => {
    if (!url) return;
    window.open(url, '_blank');
  };

  const handleCopyPrompt = async (prompt) => {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch (err) {
      // Fallback для старых браузеров
      const textarea = document.createElement('textarea');
      textarea.value = prompt;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const handleSelectPrompt = (entry) => {
    if (onSelectPrompt) {
      onSelectPrompt(entry.prompt);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (!history || history.length === 0) {
    return null;
  }

  return (
    <div className="card-custom">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h5 className="card-custom-title" style={{ marginBottom: 0 }}>История генераций</h5>
        <button
          className="btn-clear-history"
          onClick={handleClearAll}
          title="Очистить историю"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>

      <div className="history-list">
        {history.map((entry) => (
          <div key={entry.id} className="history-item">
            <div className="history-item-header" onClick={() => toggleExpand(entry.id)}>
              <div className="history-item-info">
                <span className="history-item-time">{formatTimestamp(entry.timestamp)}</span>
                <span className="history-item-ratio">{entry.aspectRatio}</span>
              </div>
              <div className="history-item-actions">
                <button
                  className="btn-icon btn-download"
                  onClick={(e) => { e.stopPropagation(); handleDownload(entry.imageUrl); }}
                  title="Скачать изображение"
                  disabled={!entry.imageUrl}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
                <button
                  className="btn-icon btn-copy"
                  onClick={(e) => { e.stopPropagation(); handleCopyPrompt(entry.prompt); }}
                  title="Скопировать промпт"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
                <button
                  className="btn-icon btn-use-prompt"
                  onClick={(e) => { e.stopPropagation(); handleSelectPrompt(entry); }}
                  title="Использовать промпт"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                  </svg>
                </button>
                <button
                  className="btn-icon btn-delete"
                  onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                  title="Удалить"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            {expandedId === entry.id && (
              <div className="history-item-detail">
                {entry.imageUrl && (
                  <div className="history-item-image">
                    <img src={entry.imageUrl} alt="Сгенерированное изображение" />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default History;
