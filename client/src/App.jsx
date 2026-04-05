import React, { useState, useRef, useCallback, useEffect } from 'react';
import PromptInput from './components/PromptInput';
import StatusTracker from './components/StatusTracker';
import ImageDisplay from './components/ImageDisplay';
import ImageModal from './components/ImageModal';
import History from './components/History';
import Rules from './components/Rules';
import { saveToHistory, getHistory } from './utils/historyStore';
import { ThemeToggle } from './ThemeContext';

const POLL_INTERVALS = [
  { maxAttempts: 10, interval: 2000 },
  { maxAttempts: 18, interval: 5000 },
  { maxAttempts: 24, interval: 10000 },
  { maxAttempts: 30, interval: 30000 },
];

function App() {
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [failMsg, setFailMsg] = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [currentAspectRatio, setCurrentAspectRatio] = useState('1:1');
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [history, setHistory] = useState(getHistory());
  const [modalImage, setModalImage] = useState(null);
  const [currentPage, setCurrentPage] = useState('main');
  const pollTimeoutRef = useRef(null);
  // Refs для актуальных значений в замыкании pollTaskStatus
  const promptRef = useRef('');
  const aspectRatioRef = useRef('1:1');

  const clearPollTimeout = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  const pollTaskStatus = useCallback(async (id, stage = 0, attempt = 0) => {
    const { maxAttempts, interval } = POLL_INTERVALS[stage] || POLL_INTERVALS[POLL_INTERVALS.length - 1];

    try {
      const response = await fetch(`/api/status/${id}`);
      const data = await response.json();

      if (data.code !== 200 || !data.data) {
        setTaskStatus('fail');
        setFailMsg(data.error || 'Не удалось получить статус задачи');
        setLoading(false);
        return;
      }

      const { state, resultJson, failMsg: errorMsg } = data.data;
      setTaskStatus(state);

      if (state === 'success') {
        clearPollTimeout();
        try {
          const parsed = JSON.parse(resultJson);
          if (parsed.resultUrls && parsed.resultUrls.length > 0) {
            const url = parsed.resultUrls[0];
            setImageUrl(url);
            const entry = saveToHistory({
              prompt: promptRef.current,
              imageUrl: url,
              aspectRatio: aspectRatioRef.current,
              timestamp: Date.now()
            });
            if (entry) {
              setHistory(prev => [entry, ...prev]);
            }
          }
        } catch (e) {
          console.error('Ошибка парсинга resultJson:', e);
        }
        setLoading(false);
      } else if (state === 'fail') {
        clearPollTimeout();
        setFailMsg(errorMsg || 'Задача не выполнена');
        setLoading(false);
      } else {
        const nextAttempt = attempt + 1;
        if (nextAttempt >= maxAttempts && stage < POLL_INTERVALS.length - 1) {
          pollTimeoutRef.current = setTimeout(() => pollTaskStatus(id, stage + 1, 0), interval);
        } else if (nextAttempt < maxAttempts) {
          pollTimeoutRef.current = setTimeout(() => pollTaskStatus(id, stage, nextAttempt), interval);
        } else {
          clearPollTimeout();
          setTaskStatus('fail');
          setFailMsg('Превышено время ожидания. Попробуйте проверить статус позже.');
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Ошибка polling:', err);
      const nextAttempt = attempt + 1;
      if (nextAttempt < maxAttempts) {
        pollTimeoutRef.current = setTimeout(() => pollTaskStatus(id, stage, nextAttempt), interval);
      } else {
        clearPollTimeout();
        setTaskStatus('fail');
        setFailMsg('Ошибка сети при проверке статуса');
        setLoading(false);
      }
    }
  }, [clearPollTimeout]);

  const handleGenerate = async ({ prompt, aspect_ratio, nsfw_checker }) => {
    setLoading(true);
    setTaskId(null);
    setTaskStatus(null);
    setImageUrl(null);
    setFailMsg(null);
    setCurrentPrompt(prompt);
    setCurrentAspectRatio(aspect_ratio);
    promptRef.current = prompt;
    aspectRatioRef.current = aspect_ratio;
    clearPollTimeout();

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspect_ratio, nsfw_checker })
      });

      const data = await response.json();

      if (data.code === 200 && data.data?.taskId) {
        const id = data.data.taskId;
        setTaskId(id);
        setTaskStatus('waiting');
        pollTaskStatus(id);
      } else {
        setTaskStatus('fail');
        setFailMsg(data.error || 'Не удалось создать задачу генерации');
        setLoading(false);
      }
    } catch (err) {
      console.error('Ошибка при генерации:', err);
      setTaskStatus('fail');
      setFailMsg('Ошибка сети при создании задачи');
      setLoading(false);
    }
  };

  const handleReset = () => {
    clearPollTimeout();
    setLoading(false);
    setTaskId(null);
    setTaskStatus(null);
    setImageUrl(null);
    setFailMsg(null);
    setCurrentPrompt('');
    setCurrentAspectRatio('1:1');
    setSelectedPrompt('');
  };

  const handleSelectPromptFromHistory = (prompt) => {
    setSelectedPrompt(prompt);
  };

  const handleHistoryChange = (updatedHistory) => {
    setHistory(updatedHistory || getHistory());
  };

  const handlePromptApplied = () => {
    setSelectedPrompt('');
  };

  return (
    <>
      <ThemeToggle />

      {currentPage === 'main' ? (
        <div className="app-container">
          <header className="app-header fade-in">
            <h1>Z-Image Генератор</h1>
            <p>Создание изображений с помощью AI (Kie.ai)</p>
          </header>

          <div className="app-rules-link">
            <button className="btn-rules" onClick={() => setCurrentPage('rules')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              Правила использования
            </button>
          </div>

          <div className="app-grid">
            <div className="app-sidebar">
              <div className="fade-in">
                <PromptInput onGenerate={handleGenerate} onReset={handleReset} loading={loading} selectedPrompt={selectedPrompt} onPromptApplied={handlePromptApplied} />
              </div>

              {(taskId && taskStatus !== 'success') && (
                <div className="fade-in">
                  <StatusTracker
                    taskId={taskId}
                    status={taskStatus}
                    failMsg={failMsg}
                  />
                </div>
              )}

              <div className="fade-in">
                <History
                  history={history}
                  onSelectPrompt={handleSelectPromptFromHistory}
                  onHistoryChange={handleHistoryChange}
                  onImageClick={(url) => setModalImage(url)}
                />
              </div>
            </div>

            <div className="fade-in">
              <ImageDisplay imageUrl={imageUrl} onImageClick={() => setModalImage(imageUrl)} />
              {!imageUrl && taskStatus !== 'fail' && (
                <div className="image-placeholder">
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>
                    Здесь появится сгенерированное изображение
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rules-container fade-in">
          <button className="btn-rules-back" onClick={() => setCurrentPage('main')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            На главную
          </button>
          <Rules />
        </div>
      )}

      {modalImage && (
        <ImageModal imageUrl={modalImage} onClose={() => setModalImage(null)} />
      )}
    </>
  );
}

export default App;
