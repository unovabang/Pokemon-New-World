import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const AdvancedModal = ({ 
  open, 
  onClose, 
  title, 
  children, 
  type = 'info', // 'info', 'success', 'error', 'confirm'
  onConfirm = null,
  confirmText = 'Confirmer',
  cancelText = 'Annuler'
}) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'fa-solid fa-check-circle';
      case 'error':
        return 'fa-solid fa-exclamation-triangle';
      case 'confirm':
        return 'fa-solid fa-question-circle';
      default:
        return 'fa-solid fa-info-circle';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return '#22c55e';
      case 'error':
        return '#ef4444';
      case 'confirm':
        return '#f59e0b';
      default:
        return '#3b82f6';
    }
  };

  const modalContent = (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-dark, #1a1a2e)',
        borderRadius: '12px',
        padding: '2rem',
        minWidth: '400px',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'auto',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '1.5rem',
          gap: '1rem'
        }}>
          <i 
            className={getIcon()}
            style={{
              fontSize: '1.5rem',
              color: getIconColor()
            }}
          ></i>
          <h2 style={{
            margin: 0,
            color: 'white',
            fontSize: '1.25rem'
          }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: '0.5rem'
            }}
          >
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        {/* Content */}
        <div style={{
          color: 'rgba(255, 255, 255, 0.9)',
          marginBottom: '2rem',
          lineHeight: '1.6'
        }}>
          {children}
        </div>

        {/* Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '1rem'
        }}>
          {type === 'confirm' && (
            <>
              <button
                onClick={onClose}
                className="btn btn-ghost"
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px'
                }}
              >
                <i className="fa-solid fa-times"></i> {cancelText}
              </button>
              <button
                onClick={() => {
                  if (onConfirm) onConfirm();
                  onClose();
                }}
                className="btn btn-primary"
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px'
                }}
              >
                <i className="fa-solid fa-check"></i> {confirmText}
              </button>
            </>
          )}
          {type !== 'confirm' && (
            <button
              onClick={onClose}
              className="btn btn-primary"
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px'
              }}
            >
              <i className="fa-solid fa-check"></i> OK
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default AdvancedModal;