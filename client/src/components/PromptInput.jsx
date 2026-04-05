import React, { useState, useRef, useEffect } from 'react';

const ASPECT_RATIOS = ['1:1', '4:3', '3:4', '16:9', '9:16'];

function PromptInput({ onGenerate, onReset, loading, selectedPrompt, onPromptApplied, onActionStart, onActionEnd }) {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [nsfwChecker, setNsfwChecker] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Apply selected prompt from history
  useEffect(() => {
    if (selectedPrompt) {
      setPrompt(selectedPrompt);
      if (onPromptApplied) onPromptApplied();
    }
  }, [selectedPrompt, onPromptApplied]);

  const hasChanges = prompt.length > 0 || aspectRatio !== '1:1' || nsfwChecker !== true;

  const handleReset = () => {
    setPrompt('');
    setAspectRatio('1:1');
    setNsfwChecker(true);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onReset) onReset();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onGenerate({ prompt: prompt.trim(), aspect_ratio: aspectRatio, nsfw_checker: nsfwChecker });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || loading || analyzing) return;

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите файл изображения');
      return;
    }

    // Проверка размера (макс. 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Размер файла не должен превышать 10MB');
      return;
    }

    // Создаем preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target.result);
    };
    reader.readAsDataURL(file);

    // Конвертируем в base64 для отправки на сервер
    setAnalyzing(true);
    if (onActionStart) onActionStart('analyzing');
    try {
      const base64Reader = new FileReader();
      base64Reader.onload = async (event) => {
        try {
          const base64Image = event.target.result;

          const response = await fetch('/api/analyze-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: base64Image })
          });

          if (!response.ok) {
            throw new Error(`Сервер вернул ошибку: ${response.status}`);
          }

          const data = await response.json();

          if (data.prompt) {
            setPrompt(data.prompt);
          } else {
            alert(data.error || 'Не удалось проанализировать изображение');
          }
        } catch (innerErr) {
          console.error('Ошибка при анализе изображения:', innerErr);
          alert(innerErr.message || 'Ошибка при анализе изображения');
          if (onActionEnd) onActionEnd(innerErr.message);
          setAnalyzing(false);
          return;
        }
        setAnalyzing(false);
        if (onActionEnd) onActionEnd();
      };
      base64Reader.readAsDataURL(file);
    } catch (err) {
      console.error('Ошибка при анализе изображения:', err);
      setAnalyzing(false);
      if (onActionEnd) onActionEnd(err.message);
    }
  };

  const handleUploadClick = () => {
    if (loading || analyzing) return;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;

    setEnhancing(true);
    if (onActionStart) onActionStart('enhancing');
    try {
      const response = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() })
      });

      if (!response.ok) {
        throw new Error(`Сервер вернул ошибку: ${response.status}`);
      }

      const data = await response.json();

      if (data.prompt) {
        setPrompt(data.prompt);
      } else {
        alert(data.error || 'Не удалось улучшить промпт');
      }
      setEnhancing(false);
      if (onActionEnd) onActionEnd();
    } catch (err) {
      console.error('Ошибка при улучшении промпта:', err);
      alert(err.message || 'Ошибка при улучшении промпта');
      setEnhancing(false);
      if (onActionEnd) onActionEnd(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-custom">
      {/* Загрузка изображения для анализа */}
      <div style={{ marginBottom: 20 }}>
        <label className="label-custom">Анализ изображения</label>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <button
            type="button"
            className="btn-secondary-custom"
            onClick={handleUploadClick}
            disabled={loading || analyzing}
            style={{ flex: 1 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {analyzing ? 'Анализ...' : 'Загрузить изображение'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
            disabled={loading || analyzing}
          />
        </div>
        {previewUrl && (
          <div style={{ marginTop: 12, borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', maxHeight: '400px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
            <img src={previewUrl} alt="Preview" style={{ width: '100%', height: 'auto', maxHeight: '400px', objectFit: 'contain', display: 'block' }} />
            <button
              type="button"
              className="btn-clear-preview"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewUrl(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              title="Удалить изображение"
              aria-label="Удалить загруженное изображение"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label htmlFor="prompt" className="label-custom" style={{ marginBottom: 0 }}>
            Промпт <span style={{ fontWeight: 400 }}>({prompt.length}/1000)</span>
          </label>
          <button
            type="button"
            className="btn-enhance"
            onClick={handleEnhancePrompt}
            disabled={loading || enhancing || analyzing || !prompt.trim()}
            title="Улучшить промпт с помощью AI"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
            {enhancing ? 'Улучшение...' : 'Улучшить промпт'}
          </button>
        </div>
        <textarea
          id="prompt"
          className="input-custom"
          rows={4}
          maxLength={1000}
          placeholder="Опишите изображение, которое хотите сгенерировать..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading || analyzing}
          required
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label htmlFor="aspectRatio" className="label-custom">Соотношение сторон</label>
        <select
          id="aspectRatio"
          className="input-custom"
          value={aspectRatio}
          onChange={(e) => setAspectRatio(e.target.value)}
          disabled={loading || analyzing}
        >
          {ASPECT_RATIOS.map((ratio) => (
            <option key={ratio} value={ratio}>{ratio}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 24, opacity: (loading || analyzing) ? 0.5 : 1, pointerEvents: (loading || analyzing) ? 'none' : 'auto' }}>
        <label className="checkbox-custom">
          <input
            type="checkbox"
            checked={nsfwChecker}
            onChange={(e) => setNsfwChecker(e.target.checked)}
            disabled={loading || analyzing}
          />
          Включить NSFW-фильтр
        </label>
      </div>

      <button
        type="submit"
        className="btn-primary-custom"
        disabled={loading || analyzing || !prompt.trim()}
      >
        {loading ? (
          <>
            <span className="spinner-inline" style={{ marginRight: 8 }} />
            Генерация...
          </>
        ) : (
          'Сгенерировать'
        )}
      </button>

      {hasChanges && !loading && (
        <button
          type="button"
          className="btn-reset"
          onClick={handleReset}
        >
          Сбросить
        </button>
      )}
    </form>
  );
}

export default PromptInput;
