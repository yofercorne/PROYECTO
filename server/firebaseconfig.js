const admin = require('firebase-admin');
const serviceAccount = require('./weblink-cf07c-firebase-adminsdk-ca1sy-d81eb13596.json'); // Asegúrate de proporcionar la ruta correcta al archivo de clave de cuenta de servicio

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;
