import React from 'react';

function ImageDisplay({ imageUrl, onImageClick }) {
  const handleClick = () => {
    if (onImageClick) {
      onImageClick();
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    window.open(imageUrl, '_blank');
  };

  if (!imageUrl) return null;

  return (
    <div className="card-custom image-result-card">
      <div
        className="image-result"
        style={{ marginBottom: 20, cursor: 'pointer' }}
        onClick={handleClick}
        title="Нажмите для просмотра"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
        aria-label="Открыть изображение в полноэкранном режиме"
      >
        <img src={imageUrl} alt="Сгенерированное изображение" loading="lazy" />
      </div>

      <button
        className="btn-success-custom"
        onClick={handleDownload}
      >
        Скачать изображение
      </button>

      <p className="download-hint">
        Изображение откроется в новой вкладке. Нажмите правой кнопкой мыши для сохранения.
      </p>
    </div>
  );
}

export default ImageDisplay;
