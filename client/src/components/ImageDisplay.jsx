import React, { useState } from 'react';

function ImageDisplay({ imageUrl, downloadUrl }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadLink, setDownloadLink] = useState(downloadUrl || null);

  const handleOpenInNewTab = async () => {
    if (!imageUrl) return;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error('Ошибка при открытии изображения:', err);
      window.open(imageUrl, '_blank');
    }
  };

  const handleDownload = async () => {
    if (downloadLink) {
      window.open(downloadLink, '_blank');
      return;
    }

    if (!imageUrl) return;

    setDownloading(true);
    try {
      const response = await fetch('/api/download-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: imageUrl })
      });

      const data = await response.json();

      if (data.code === 200 && data.data) {
        setDownloadLink(data.data);
        window.open(data.data, '_blank');
      } else {
        alert('Не удалось получить ссылку для скачивания');
      }
    } catch (err) {
      console.error('Ошибка при скачивании:', err);
      alert('Ошибка при скачивании изображения');
    } finally {
      setDownloading(false);
    }
  };

  if (!imageUrl) return null;

  return (
    <div className="card-custom">
      <h5 className="card-custom-title">Результат</h5>

      <div
        className="image-result"
        style={{ marginBottom: 20, cursor: 'pointer' }}
        onClick={handleOpenInNewTab}
        title="Открыть в новой вкладке"
      >
        <img src={imageUrl} alt="Сгенерированное изображение" />
      </div>

      <button
        className="btn-success-custom"
        onClick={handleDownload}
        disabled={downloading}
      >
        {downloading ? (
          <>
            <span className="spinner-inline" style={{ marginRight: 8 }} />
            Получение ссылки...
          </>
        ) : (
          'Скачать изображение'
        )}
      </button>

      {downloadLink && (
        <p className="download-hint">
          Ссылка действительна в течение 20 минут.
        </p>
      )}
    </div>
  );
}

export default ImageDisplay;
