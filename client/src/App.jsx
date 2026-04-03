import React, { useState, useRef, useCallback } from 'react';
import PromptInput from './components/PromptInput';
import StatusTracker from './components/StatusTracker';
import ImageDisplay from './components/ImageDisplay';
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
  const pollTimeoutRef = useRef(null);

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
            setImageUrl(parsed.resultUrls[0]);
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
  };

  return (
    <>
      <ThemeToggle />
      <div className="app-container">
        <header className="app-header fade-in">
          <h1>Z-Image Генератор</h1>
          <p>Создание изображений с помощью AI (Kie.ai)</p>
        </header>

        <div className="app-grid">
          <div className="app-sidebar">
            <div className="fade-in">
              <PromptInput onGenerate={handleGenerate} onReset={handleReset} loading={loading} />
            </div>

            {(taskId || taskStatus) && (
              <div className="fade-in">
                <StatusTracker
                  taskId={taskId}
                  status={taskStatus}
                  failMsg={failMsg}
                />
              </div>
            )}
          </div>

          <div className="fade-in">
            <ImageDisplay imageUrl={imageUrl} />
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
    </>
  );
}

export default App;
