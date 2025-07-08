// src/components/chat/MediaPreview.jsx

import React from "react";
import { FiPaperclip, FiSend, FiX, FiMic } from "react-icons/fi"; // Added FiMic

const MediaPreview = ({ file, onSend, onCancel }) => {
  if (!file) return null;

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const isAudio = file.type.startsWith("audio/");

  let previewContent;
  let fileName = file.name || (isAudio ? "Voice Note.webm" : "File"); // Default name for audio

  if (isImage || isVideo) {
    previewContent = (
      <img
        src={URL.createObjectURL(file)}
        alt="Preview"
        className="media-preview-image"
      />
    );
  } else if (isAudio) {
    previewContent = (
      <audio
        src={URL.createObjectURL(file)}
        controls
        className="media-preview-audio"
      />
    );
  } else {
    previewContent = (
      <div className="media-preview-icon">
        <FiPaperclip size={30} />
      </div>
    );
  }

  return (
    <div className="media-preview-overlay">
      <div className="media-preview-content">
        <div className="media-preview-display">{previewContent}</div>
        <div className="media-preview-info">
          <span>{fileName}</span>
          {file.size && (
            <span>({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
          )}
        </div>
        <div className="media-preview-actions">
          <button onClick={onCancel} className="media-preview-cancel">
            <FiX size={24} />
          </button>
          <button onClick={() => onSend(file)} className="media-preview-send">
            <FiSend size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MediaPreview;
