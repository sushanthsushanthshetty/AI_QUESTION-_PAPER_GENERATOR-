import React, { useRef, useState } from 'react';

export default function ProfilePictureUpload({ currentPicture, name, onPictureChange }) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  // Generate initials avatar
  const getInitials = () => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const getAvatarColors = (name) => {
    const colors = [
      '#1a3560', '#2d5a8e', '#6b3fa0', '#c0392b',
      '#d35400', '#16a085', '#2980b9', '#8e44ad',
      '#2c3e50', '#7f8c8d'
    ];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a JPG, PNG, or WebP image');
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setPreview(base64);
      onPictureChange(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setPreview(null);
    onPictureChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const displaySrc = preview || currentPicture;

  return (
    <div className="profile-picture-upload">
      <div
        className="profile-avatar"
        style={{
          backgroundColor: displaySrc ? 'transparent' : getAvatarColors(name),
          cursor: 'pointer'
        }}
        onClick={handleClick}
        title="Click to upload photo"
      >
        {displaySrc ? (
          <img
            src={displaySrc}
            alt="Profile"
            className="profile-avatar-img"
          />
        ) : (
          <span className="profile-avatar-initials">{getInitials()}</span>
        )}
        <div className="profile-avatar-overlay">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      {displaySrc && (
        <button
          className="btn btn-outline btn-sm"
          onClick={handleRemove}
          style={{ marginTop: '0.5rem', fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
        >
          Remove Photo
        </button>
      )}
      {error && <p className="field-error">{error}</p>}
      <p className="field-hint" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
        Click to upload. JPG, PNG, or WebP. Max 5MB.
      </p>
    </div>
  );
}