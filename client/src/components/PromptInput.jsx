import React, { useState } from 'react';

const ASPECT_RATIOS = ['1:1', '4:3', '3:4', '16:9', '9:16'];

function PromptInput({ onGenerate, loading }) {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [nsfwChecker, setNsfwChecker] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onGenerate({ prompt: prompt.trim(), aspect_ratio: aspectRatio, nsfw_checker: nsfwChecker });
  };

  return (
    <form onSubmit={handleSubmit} className="card-custom">
      <h5 className="card-custom-title">Настройки генерации</h5>

      <div style={{ marginBottom: 20 }}>
        <label htmlFor="prompt" className="label-custom">
          Промпт <span style={{ fontWeight: 400 }}>({prompt.length}/1000)</span>
        </label>
        <textarea
          id="prompt"
          className="input-custom"
          rows={4}
          maxLength={1000}
          placeholder="Опишите изображение, которое хотите сгенерировать..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
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
        >
          {ASPECT_RATIOS.map((ratio) => (
            <option key={ratio} value={ratio}>{ratio}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label className="checkbox-custom">
          <input
            type="checkbox"
            checked={nsfwChecker}
            onChange={(e) => setNsfwChecker(e.target.checked)}
          />
          Включить NSFW-фильтр
        </label>
      </div>

      <button
        type="submit"
        className="btn-primary-custom"
        disabled={loading || !prompt.trim()}
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
    </form>
  );
}

export default PromptInput;
