// src/components/chat/MediaHandler.jsx (Final Refined Version)

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { FiX } from "react-icons/fi"; // Only need X for stopping camera

import "./MediaHandler.css"; // Styles for the camera interface overlay

/**
 * MediaHandler component manages camera capture and voice recording processes.
 * It exposes methods to its parent via a ref (useImperativeHandle) and
 * communicates results/state changes via callbacks.
 * It renders its own camera interface overlay.
 */
const MediaHandler = forwardRef(
  ({ onFileReadyForPreview, onCameraClosed, onRecordingStopped }, ref) => {
    // --- Camera State & Refs ---
    const [cameraStream, setCameraStream] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null); // Used for image capture

    // --- Voice Note State & Refs ---
    const [isRecordingVoiceNoteInternal, setIsRecordingVoiceNoteInternal] =
      useState(false); // Internal state
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    // --- Exposed Functions via useImperativeHandle ---
    useImperativeHandle(ref, () => ({
      // Camera methods
      startCamera: () => startCameraInternal(),
      stopCamera: () => stopCameraInternal(),
      // Voice note methods
      startVoiceNoteRecording: () => startVoiceNoteRecordingInternal(),
      stopVoiceNoteRecording: () => stopVoiceNoteRecordingInternal(),
      // Expose internal state for parent to query if needed, or rely on callbacks
      // isCameraActive: !!cameraStream, // Example - better to use onCameraClosed callback
      // isRecordingVoiceNote: isRecordingVoiceNoteInternal, // Example - better to use onRecordingStopped callback
    }));

    // --- Internal Camera Functions ---
    const startCameraInternal = useCallback(async () => {
      try {
        // Ensure any active recording is stopped before starting camera
        if (isRecordingVoiceNoteInternal && mediaRecorderRef.current) {
          mediaRecorderRef.current.stop(); // This will trigger onRecordingStopped via onstop event
        }
        setIsRecordingVoiceNoteInternal(false);
        audioChunksRef.current = []; // Clear any pending audio chunks

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false, // Only video for camera
        });
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        // Inform parent that camera is now active
        // onCameraActive(); // If you had an onCameraActive callback
      } catch (err) {
        console.error("Camera error:", err);
        alert(
          "Failed to access camera. Please ensure camera permissions are granted."
        );
        setCameraStream(null);
        onCameraClosed(); // Inform parent that camera failed to start
      }
    }, [isRecordingVoiceNoteInternal, onCameraClosed]); // Added onCameraClosed to dependency array

    const captureImage = useCallback(() => {
      if (videoRef.current && canvasRef.current) {
        const context = canvasRef.current.getContext("2d");
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);

        canvasRef.current.toBlob(
          (blob) => {
            const file = new File([blob], `photo_${Date.now()}.png`, {
              type: "image/png",
            });
            onFileReadyForPreview(file); // Send captured image to parent for preview
          },
          "image/png",
          0.9
        );
      }
    }, [onFileReadyForPreview]);

    const stopCameraInternal = useCallback(() => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
        onCameraClosed(); // Inform parent that camera is closed
      }
    }, [cameraStream, onCameraClosed]); // Added onCameraClosed to dependency array

    // --- Internal Voice Note Functions ---
    const startVoiceNoteRecordingInternal = useCallback(async () => {
      try {
        // Ensure camera is stopped if active
        if (cameraStream) stopCameraInternal();

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          onFileReadyForPreview(audioBlob); // Send recorded audio to parent for preview
          setIsRecordingVoiceNoteInternal(false);
          // Stop audio stream tracks from original stream
          stream.getTracks().forEach((track) => track.stop());
          onRecordingStopped(); // Inform parent that recording stopped
        };

        mediaRecorderRef.current.start();
        setIsRecordingVoiceNoteInternal(true);
      } catch (err) {
        console.error("Voice recording error:", err);
        alert(
          "Failed to access microphone. Please ensure microphone permissions are granted."
        );
        setIsRecordingVoiceNoteInternal(false);
        onRecordingStopped(); // Inform parent that recording failed
      }
    }, [
      cameraStream,
      stopCameraInternal,
      onFileReadyForPreview,
      onRecordingStopped,
    ]); // Added dependencies

    const stopVoiceNoteRecordingInternal = useCallback(() => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
      // No explicit setIsRecordingVoiceNoteInternal(false) here, it's handled by onstop.
    }, []);

    // --- Lifecycle Cleanup ---
    useEffect(() => {
      return () => {
        stopCameraInternal(); // Use internal functions for cleanup
        stopVoiceNoteRecordingInternal();
      };
    }, [stopCameraInternal, stopVoiceNoteRecordingInternal]);

    return (
      <>
        {/* Camera Interface Overlay (renders only when cameraStream is active) */}
        {cameraStream && (
          <div className="camera-interface-overlay">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="camera-view"
            />
            <div className="camera-controls-bottom">
              <button
                onClick={stopCameraInternal}
                className="camera-action-button"
              >
                <FiX size={24} />
              </button>
              <button onClick={captureImage} className="capture-button">
                <div className="inner-circle" />
              </button>
            </div>
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>
        )}
      </>
    );
  }
);

export default MediaHandler;
