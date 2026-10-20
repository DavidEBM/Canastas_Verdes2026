const cloudinary = require('cloudinary').v2;

// Configuración (puedes usar variables de entorno)
cloudinary.config({
  cloud_name: 'CLOUD_NAME',
  api_key: 'API_KEY',
  api_secret: 'API_SECRET'
});

// 1. Subir una imagen a una carpeta
async function uploadImage() {
  const result = await cloudinary.uploader.upload('./imagen.jpg', {
    folder: 'CanastasVerdes',
    public_id: 'producto1'
  });
  console.log(result.secure_url);
}

// 2. Editar (sobrescribir) una imagen existente
async function editImage() {
  const result = await cloudinary.uploader.upload('./nueva-imagen.jpg', {
    folder: 'CanastasVerdes',
    public_id: 'producto1',
    overwrite: true
  });
  console.log(result.secure_url);
}

// 3. Eliminar una imagen
async function deleteImage() {
  const result = await cloudinary.uploader.destroy('CanastasVerdes/producto1');
  console.log(result);
}