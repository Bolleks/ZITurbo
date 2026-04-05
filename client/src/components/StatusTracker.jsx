import React from 'react';

const STATUS_CONFIG = {
  waiting: { label: 'Ожидание', icon: '⏳', className: 'status-waiting' },
  queuing: { label: 'В очереди', icon: '📋', className: 'status-queuing' },
  generating: { label: 'Генерация', icon: '🎨', className: 'status-generating' },
  success: { label: 'Готово', icon: '✅', className: 'status-success' },
  fail: { label: 'Ошибка', icon: '❌', className: 'status-fail' }
};

function StatusTracker({ taskId, status, failMsg, customStatus }) {
  const config = customStatus || STATUS_CONFIG[status] || STATUS_CONFIG.waiting;
  const isLoading = !customStatus && (status === 'waiting' || status === 'queuing' || status === 'generating');

  return (
    <div className="card-custom">
      <h6 className="card-custom-title">
        {customStatus ? 'Статус' : 'Статус задачи'}
      </h6>

      {taskId && (
        <p style={{ marginBottom: 12 }}>
          <span className="task-id">{taskId}</span>
        </p>
      )}

      <div className={`status-badge ${config.className}`}>
        <span className="icon">{config.icon}</span>
        <strong>{config.label}</strong>
      </div>

      {status === 'fail' && failMsg && (
        <div className="error-message">
          <strong>Ошибка:</strong> {failMsg}
        </div>
      )}

      {isLoading && (
        <div style={{ marginTop: 16 }}>
          <div className="progress-bar-custom">
            <div className="progress-bar-fill" />
          </div>
          <small style={{ color: 'var(--text-muted)', marginTop: 8, display: 'block' }}>
            Пожалуйста, подождите. Генерация может занять до нескольких минут...
          </small>
        </div>
      )}

      {customStatus && (
        <div style={{ marginTop: 16 }}>
          {!customStatus.error && (
            <div className="progress-bar-custom">
              <div className="progress-bar-fill" />
            </div>
          )}
          {customStatus.error && (
            <div className="error-message" style={{ marginTop: 0 }}>
              <strong>Ошибка:</strong> {customStatus.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StatusTracker;
