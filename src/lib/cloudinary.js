/**
 * Uploads an image to Cloudinary using the Upload API
 * @param {File} file - The file to upload
 * @returns {Promise<string>} The uploaded image URL
 */
export const uploadImage = async (file) => {
  try {
    const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'djvwuaoja';
    const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'PGO-INVENTORY';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('cloud_name', CLOUD_NAME);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to upload image');
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}; 