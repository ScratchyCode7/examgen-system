import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { apiService, API_BASE_URL } from '../services/api';
import '../styles/QuestionImageUpload.css';

const QuestionImageUpload = forwardRef(({ questionId, existingImage, onImageUpdate, isDarkMode }, ref) => {
  const [imageData, setImageData] = useState(existingImage || null);
  const [widthPercentage, setWidthPercentage] = useState(existingImage?.widthPercentage || 50);
  const [alignment, setAlignment] = useState(existingImage?.alignment || 'Center');
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(
    existingImage ? `${API_BASE_URL}/${existingImage.imagePath}` : null
  );
  const [pendingFile, setPendingFile] = useState(null);
  const fileInputRef = useRef(null);

  // Expose method to upload pending file after question creation
  useImperativeHandle(ref, () => ({
    uploadPendingImage: async (newQuestionId) => {
      if (!pendingFile || !newQuestionId) return null;
      
      try {
        setIsUploading(true);
        const response = await apiService.uploadQuestionImage(
          newQuestionId,
          pendingFile,
          widthPercentage,
          alignment
        );
        setImageData(response);
        setPreviewUrl(`${API_BASE_URL}/${response.imagePath}`);
        setPendingFile(null);
        if (onImageUpdate) onImageUpdate(response);
        return response;
      } catch (error) {
        console.error('Failed to upload pending image:', error);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    hasPendingImage: () => !!pendingFile
  }));

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Show preview immediately using client-side FileReader
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
    };
    reader.readAsDataURL(file);

    // If questionId exists, upload immediately
    if (questionId) {
      try {
        setIsUploading(true);
        const response = await apiService.uploadQuestionImage(
          questionId,
          file,
          widthPercentage,
          alignment
        );
        setImageData(response);
        setPreviewUrl(`${API_BASE_URL}/${response.imagePath}`);
        if (onImageUpdate) onImageUpdate(response);
        alert('Image uploaded successfully!');
      } catch (error) {
        console.error('Failed to upload image:', error);
        alert('Failed to upload image. Please try again.');
        setPreviewUrl(null);
      } finally {
        setIsUploading(false);
      }
    } else {
      // Store pending file for upload after question creation
      setPendingFile(file);
    }
  };

  const handleDelete = async () => {
    if (!imageData || !questionId) return;

    if (!window.confirm('Are you sure you want to delete this image?')) return;

    try {
      setIsUploading(true);
      await apiService.deleteQuestionImage(questionId);
      setImageData(null);
      setPreviewUrl(null);
      if (onImageUpdate) onImageUpdate(null);
      alert('Image deleted successfully!');
    } catch (error) {
      console.error('Failed to delete image:', error);
      alert('Failed to delete image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleWidthChange = async (newWidth) => {
    setWidthPercentage(newWidth);
    
    // Update on server if image exists
    if (imageData && questionId) {
      try {
        // Re-upload with new settings (backend replaces existing)
        const file = fileInputRef.current?.files?.[0];
        if (file) {
          const response = await apiService.uploadQuestionImage(
            questionId,
            file,
            newWidth,
            alignment
          );
          setImageData(response);
          setPreviewUrl(`${API_BASE_URL}/${response.imagePath}`);
          if (onImageUpdate) onImageUpdate(response);
        }
      } catch (error) {
        console.error('Failed to update width:', error);
      }
    }
  };

  const handleAlignmentChange = async (newAlignment) => {
    setAlignment(newAlignment);
    
    // Update on server if image exists
    if (imageData && questionId) {
      try {
        const file = fileInputRef.current?.files?.[0];
        if (file) {
          const response = await apiService.uploadQuestionImage(
            questionId,
            file,
            widthPercentage,
            newAlignment
          );
          setImageData(response);
          setPreviewUrl(`${API_BASE_URL}/${response.imagePath}`);
          if (onImageUpdate) onImageUpdate(response);
        }
      } catch (error) {
        console.error('Failed to update alignment:', error);
      }
    }
  };

  return (
    <div className={`question-image-upload ${isDarkMode ? 'dark' : ''}`}>
      <div className="image-upload-header">
        <ImageIcon size={20} />
        <span>Question Image (Optional)</span>
      </div>

      {!previewUrl ? (
        <div className="image-upload-area" onClick={() => fileInputRef.current?.click()}>
          <Upload size={32} />
          <p>Click to upload image</p>
          <small>Max 5MB • JPG, PNG, GIF, WEBP</small>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={isUploading}
          />
        </div>
      ) : (
        <div className="image-preview-container">
          <div className="image-preview" style={{ textAlign: alignment.toLowerCase() }}>
            <img
              src={previewUrl}
              alt="Question"
              style={{ width: `${widthPercentage}%`, maxHeight: '400px', objectFit: 'contain' }}
            />
          </div>

          <div className="image-controls">
            <div className="control-group">
              <label>Width: {widthPercentage}%</label>
              <input
                type="range"
                min="10"
                max="100"
                value={widthPercentage}
                onChange={(e) => handleWidthChange(parseInt(e.target.value))}
                disabled={isUploading}
              />
            </div>

            <div className="control-group">
              <label>Alignment:</label>
              <div className="alignment-buttons">
                {['Left', 'Center', 'Right'].map((align) => (
                  <button
                    key={align}
                    className={`align-btn ${alignment === align ? 'active' : ''}`}
                    onClick={() => handleAlignmentChange(align)}
                    disabled={isUploading}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>

            <button className="delete-image-btn" onClick={handleDelete} disabled={isUploading}>
              <X size={16} />
              Remove Image
            </button>
          </div>
        </div>
      )}

      {!questionId && previewUrl && (
        <div className="image-upload-hint">
          <small>💡 Image will be uploaded when you save the question</small>
        </div>
      )}
    </div>
  );
});

export default QuestionImageUpload;
