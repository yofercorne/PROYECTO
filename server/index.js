const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const axios = require('axios');
const app = express();
const upload = require('./uploadConfig');  // Importa la configuración de multer
app.use('/uploads', express.static('uploads'));
app.use(express.json());
const path = require('path'); // Importar el módulo path
const PROJECT_ID = 'weblink-cf07c'; // ID del proyecto de Dialogflow
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const admin = require('./firebaseconfig');  // Importa la configuración de Firebase Admin SDK
//::::::::::::: BAD WORDS::::::::::::::::::::::::::
const forbiddenWords = ['sexual','cariñosa', 'incaprod', 'muerte', 'asesinato', 'kinesiologa', 'sexo oral', 'sexo']; // Añade aquí las palabras prohibidas

const containsForbiddenWords = (text) => {
  const regex = new RegExp(forbiddenWords.join('|'), 'i');
  return regex.test(text);
};
const adminId = 'U3pxSzsCeDakd47fN4pbipALvSc2'; // Reemplaza esto con el UID de tu cuenta de administrador

//::::::::::::::::::::::::::::::::::::::::::::::::::::::
const PORT = process.env.PORT || 3001;
//const PORT = process.env.PORT || 8080; // puerto de escucha del frontend

app.use(cors());
app.use(bodyParser.json());




// Configuración de Cloudinary
cloudinary.config({
  cloud_name: 'dhyaemduq',
  api_key: '689946589372479',
  api_secret: 'GNX0hPoZq_EGpW1XKU6SnvdwSPY'
});


// Conexión a MySQL
//const db = mysql.createConnection({
  //host: "localhost", // La IP elástica de tu instancia EC2
  //user: "root",      // El usuario que creaste
  //password: "Mauricio_nets4", // La contraseña que creaste
 // database: "perfilusuario"
//});

//
// Conexión a MySQL
const db = mysql.createConnection({
  host: "18.233.181.228", // La IP elástica de tu instancia EC2
  user: "yofercf",      // El usuario que creaste
  password: "Mauricio_nets4", // La contraseña que creaste
  database: "perfilusuario"
});
//

db.connect(err => {
    if (err) {
        console.error('Error connecting to the database: ' + err.stack);
        return;
    }
    console.log('Connected to database with thread ID: ' + db.threadId);
});
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//:::::::::::::::::::::::::::::::: CREAR  CHATBOT::::::::::::::::::::::::::::::::::::::


// Almacén de sesiones para mantener el contexto
const sessions = {};

// Respuestas predefinidas del chatbot con soporte para contexto
const responses = {
    'hola': '¡Hola! ¿En qué puedo ayudarte?',
    'cómo estás': 'Estoy bien, gracias por preguntar. ¿Y tú?',
    'qué servicios ofrecen': 'Ofrecemos una variedad de servicios, desde carpintería hasta programación.',
    'adiós': '¡Adiós! Que tengas un buen día.',
    'default': 'Lo siento, no entiendo tu pregunta. ¿Podrías reformularla?'
};

// Ruta del chatbot
app.post('/api/chatbot', (req, res) => {
    const { message, sessionId } = req.body;
    if (!sessions[sessionId]) {
        sessions[sessionId] = [];
    }
    sessions[sessionId].push({ sender: 'user', message });

    const lowerCaseMessage = message.toLowerCase();
    const response = responses[lowerCaseMessage] || responses['default'];

    sessions[sessionId].push({ sender: 'bot', message: response });
    res.json({ reply: response });
});

//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
// ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
// ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//                                  REGISTRO    
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'jobnnest@gmail.com',
    pass: 'itvbqjsgligstddc'
  }
});

// Función para extraer información del correo electrónico
const extractUserInfoFromEmail = (email) => {
  const parts = email.split('@');
  const localPart = parts[0];
  const [nombre, apellido] = localPart.split('.');
  return {
    nombre: nombre ? nombre : 'sin nombre',
    apellido: apellido ? apellido : 'sin apellido'
  };
};

app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  console.log('Received user data:', req.body);

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  // Generar el código de verificación y almacenar temporalmente en memoria o en una base de datos temporal
  const verificationCode = crypto.randomBytes(3).toString('hex');
  const user = { email, password, verificationCode, verified: false };

  // Almacenar el código de verificación temporalmente en memoria
  global.verificationStore = global.verificationStore || {};
  global.verificationStore[email] = { password, verificationCode };

  // Ruta absoluta de la imagen local
  const imagePath = path.join(__dirname, 'assets', 'verification.jpg');

  transporter.sendMail({
    from: 'ChambaYa@gmail.com',
    to: email,
    subject: 'Código de verificación',
    html: `
      <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333; max-width: 600px; margin: auto;">
        <div style="background-color: #007bff; padding: 20px; border-radius: 5px 5px 0 0;">
          <h2 style="color: #fff; text-align: center;">Bienvenido a ChambaYa!</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px;">
          <p>Gracias por registrarte en nuestra plataforma. Para completar tu registro, por favor verifica tu correo electrónico usando el código de verificación a continuación:</p>
          <p style="font-size: 24px; font-weight: bold; color: #007bff; text-align: center;">${verificationCode}</p>
          <p>Si no solicitaste esta verificación, por favor ignora este correo electrónico.</p>
          <br>
          <p>Saludos,</p>
          <p>El equipo de ChambaYa</p>
          <br>
          <img src="cid:verificationImage" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" alt="Verification Image"/>
        </div>
      </div>
    `,
    attachments: [{
      filename: 'verification.jpg',
      path: imagePath,
      cid: 'verificationImage' // Este es el ID de contenido que se utilizará en el HTML
    }]
  }, (err, info) => {
    if (err) {
      console.error('Error sending email:', err);
      return res.status(500).json({ message: 'Failed to send verification email.', error: err.message });
    }
    res.status(200).json({ message: 'Usuario registrado. Por favor, verifica tu correo electrónico.' });
  });
});


// Verificar el correo electrónico y crear el usuario en Firebase
// Verificar el correo electrónico y crear el usuario en Firebase
app.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;

  const storedData = global.verificationStore ? global.verificationStore[email] : null;

  if (!storedData) {
    return res.status(400).json({ message: 'No se encontró ninguna solicitud de registro para este correo electrónico.' });
  }

  if (storedData.verificationCode !== code) {
    return res.status(400).json({ message: 'Código de verificación incorrecto.' });
  }

  try {
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        userRecord = await admin.auth().createUser({
          email,
          password: storedData.password
        });
      } else {
        throw error;
      }
    }

    await admin.auth().updateUser(userRecord.uid, { emailVerified: true });

    const sqlInsertUser = 'INSERT INTO users (email, password, verification_code, verified) VALUES (?, ?, ?, ?)';
    db.query(sqlInsertUser, [email, storedData.password, code, true], (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to register user in users table', error: err.message });
      }

      const userInfo = extractUserInfoFromEmail(email);
      const sqlInsertUsuario = 'INSERT INTO usuario (id, correo, nombre, apellido, edad, foto, dni, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
      
      // Logging the values being inserted to usuario table
      console.log('Inserting into usuario:', [userRecord.uid, email, userInfo.nombre, userInfo.apellido, 0, null, null, null]);

      db.query(sqlInsertUsuario, [userRecord.uid, email, userInfo.nombre, userInfo.apellido, 0, null, null, null], (err, result) => {
        if (err) {
          console.error('Error al crear el usuario en la tabla usuario:', err.message);
          return res.status(500).json({ message: 'Failed to register user in usuario table', error: err.message });
        }

        delete global.verificationStore[email];

        res.status(200).json({ message: 'Correo verificado correctamente. Usuario registrado en Firebase y en ambas tablas de la base de datos local.' });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el usuario en Firebase.', error: error.message });
  }
});


// Actualizar el estado de verificación de correo en la base de datos
app.post('/update-email-verification', (req, res) => {
  const { email } = req.body;
  const sql = 'UPDATE users SET verified = 1 WHERE email = ?';
  db.query(sql, [email], (err, result) => {
    if (err) {
      console.error('Error updating email verification status:', err);
      return res.status(500).json({ message: 'Failed to update email verification status.', error: err.message });
    }
    res.status(200).json({ message: 'Email verification status updated successfully.' });
  });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM users WHERE email = ? AND password = ? AND verified = 1';

  db.query(sql, [email, password], (err, result) => {
    if (err) {
      console.error('Error logging in:', err);
      return res.status(500).json({ message: 'Error al iniciar sesión.' });
    }
    
    if (result.length > 0) {
      res.status(200).json({ message: 'Inicio de sesión exitoso.', user: result[0] });
    } else {
      res.status(400).json({ message: 'Correo o contraseña incorrectos, o el correo no ha sido verificado.' });
    }
  });
});


//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//                      NOTIFICACIONES

// Suscribirse a un usuario
// Suscribirse a un usuario
// Endpoint para verificar suscripción existente

app.post('/api/check-subscription', (req, res) => {
  const { userId, publisherId } = req.body;
  if (!userId || !publisherId) {
    return res.status(400).json({ error: 'Both userId and publisherId are required' });
  }

  const sql = 'SELECT * FROM Subscriptions WHERE subscriber_id = ? AND publisher_id = ?';
  db.query(sql, [userId, publisherId], (err, result) => {
    if (err) {
      console.error('Error checking subscription:', err);
      return res.status(500).json({ error: 'Error checking subscription', details: err.message });
    }
    if (result.length > 0) {
      res.status(200).json({ subscribed: true });
    } else {
      res.status(200).json({ subscribed: false });
    }
  });
});

// Endpoint para suscribirse a las notificaciones
app.post('/api/subscribe', (req, res) => {
  const { userId, publisherId } = req.body;
  if (!userId || !publisherId) {
    return res.status(400).json({ error: 'Both userId and publisherId are required' });
  }

  // Primero verifica si la suscripción ya existe
  const checkSql = 'SELECT * FROM Subscriptions WHERE subscriber_id = ? AND publisher_id = ?';
  db.query(checkSql, [userId, publisherId], (checkErr, checkResult) => {
    if (checkErr) {
      console.error('Error checking subscription:', checkErr);
      return res.status(500).json({ error: 'Error checking subscription', details: checkErr.message });
    }

    if (checkResult.length > 0) {
      // La suscripción ya existe
      return res.status(400).json({ error: 'Subscription already exists' });
    } else {
      // Crear la suscripción
      const sql = 'INSERT INTO Subscriptions (subscriber_id, publisher_id) VALUES (?, ?)';
      db.query(sql, [userId, publisherId], (err, result) => {
        if (err) {
          console.error('Error creating subscription:', err);
          return res.status(500).json({ error: 'Error creating subscription', details: err.message });
        }
        res.status(200).json({ message: 'Subscription created successfully' });
      });
    }
  });
});

// Endpoint para desuscribirse de las notificaciones
app.post('/api/unsubscribe', (req, res) => {
  const { userId, publisherId } = req.body;
  if (!userId || !publisherId) {
    return res.status(400).json({ error: 'Both userId and publisherId are required' });
  }

  const sql = 'DELETE FROM Subscriptions WHERE subscriber_id = ? AND publisher_id = ?';
  db.query(sql, [userId, publisherId], (err, result) => {
    if (err) {
      console.error('Error deleting subscription:', err);
      return res.status(500).json({ error: 'Error deleting subscription', details: err.message });
    }
    res.status(200).json({ message: 'Unsubscribed successfully' });
  });
});


// Obtener suscripciones de un usuario
app.get('/api/subscriptions', (req, res) => {
  const { userId } = req.query;  // userId se pasa desde el frontend

  const sql = 'SELECT * FROM Subscriptions WHERE subscriber_id = ?';
  db.query(sql, [userId], (err, results) => {
      if (err) {
          console.error('Error fetching subscriptions:', err);
          return res.status(500).json({ error: 'Error fetching subscriptions', details: err.message });
      }
      res.json(results);
  });
});

// Enviar notificación a los suscriptores
const sendNotifications = (publisherId, jobTitle) => {
  const sql = `
      SELECT subscriber_id FROM Subscriptions WHERE publisher_id = ?
  `;

  db.query(sql, [publisherId], (err, results) => {
      if (err) {
          console.error('Error fetching subscribers:', err);
          return;
      }

      const message = `Nuevo empleo publicado: ${jobTitle}`;
      results.forEach(result => {
          const sqlInsertNotification = `
              INSERT INTO Notifications (user_id, message) VALUES (?, ?)
          `;
          db.query(sqlInsertNotification, [result.subscriber_id, message], (err) => {
              if (err) {
                  console.error('Error creating notification:', err);
              }
          });
      });
  });
};


// Ruta para obtener notificaciones de un usuario
// Ruta para obtener notificaciones de un usuario
app.get('/api/notifications', (req, res) => {
  const { userId } = req.query;  // userId se pasa desde el frontend
  const sql = 'SELECT * FROM Notifications WHERE user_id = ?';

//  const sql = 'SELECT * FROM Notifications WHERE user_id = ? AND is_read = FALSE';
  db.query(sql, [userId], (err, results) => {
      if (err) {
          console.error('Error fetching notifications:', err);
          return res.status(500).json({ error: 'Error fetching notifications', details: err.message });
      }
      res.json(results);
  });
});



// Ruta para obtener las notificaciones de un usuario
app.get('/notifications/:user_id', (req, res) => {
  const userId = req.params.user_id;
  const query = 'SELECT * FROM Notifications WHERE user_id = ?';

  db.query(query, [userId], (error, results) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'No notifications found' });
    }
    res.json(results);
  });
});


// Marcar notificaciones como leídas
app.post('/api/notifications/mark-read', (req, res) => {
  const { userId } = req.body;  // userId se pasa desde el frontend

  const sql = 'UPDATE Notifications SET is_read = TRUE WHERE user_id = ?';
  db.query(sql, [userId], (err, result) => {
      if (err) {
          console.error('Error marking notifications as read:', err);
          return res.status(500).json({ error: 'Error marking notifications as read', details: err.message });
      }
      res.json({ message: 'Notifications marked as read' });
  });
});


//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::

// ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
// ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//                                  IMAGE    
  // Ruta para subir la imagen del perfil
app.post('/api/upload/profile', upload.single('profilePic'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }
  const userId = req.body.userId;
  const imageUrl = `/uploads/${req.file.filename}`;

  // Actualizar la imagen del usuario en la tabla usuario
  const sqlUpdateUser = 'UPDATE usuario SET foto = ? WHERE id = ?';

  db.query(sqlUpdateUser, [imageUrl, userId], (err) => {
    if (err) {
      console.error('Error updating user image:', err);
      return res.status(500).json({ error: 'Error updating user image', details: err.message });
    }

    res.json({ message: 'User profile image updated successfully', imageUrl: imageUrl });
  });
});
// Endpoint de carga de varias imagen
// Endpoint de carga de imagen
app.post('/api/upload', upload.array('serviceImages', 10), (req, res) => {
  if (!req.files) {
    return res.status(400).send('No files uploaded');
  }
  const userId = req.body.userId;
  const serviceId = req.body.serviceId;
  const imageUrls = req.files.map(file => `/uploads/${file.filename}`);

  // Actualizar la imagen del usuario en la tabla usuario
  const sqlUpdateUser = 'UPDATE usuario SET foto = ? WHERE id = ?';
  const sqlUpdateService = 'UPDATE services SET user_img = ? WHERE user_id = ?';

  db.query(sqlUpdateUser, [imageUrls[0], userId], (err) => {
    if (err) {
      console.error('Error updating user image:', err);
      return res.status(500).json({ error: 'Error updating user image', details: err.message });
    }

    db.query(sqlUpdateService, [imageUrls[0], userId], (err) => {
      if (err) {
        console.error('Error updating service image:', err);
        return res.status(500).json({ error: 'Error updating service image', details: err.message });
      }

      // Insertar URLs de imágenes en la tabla ServiceImages
      const imageInsertValues = imageUrls.map(url => [serviceId, url]);
      const sqlInsertImages = 'INSERT INTO ServiceImages (service_id, image_url) VALUES ?';

      db.query(sqlInsertImages, [imageInsertValues], (err) => {
        if (err) {
          console.error('Error inserting service images:', err);
          return res.status(500).json({ error: 'Error inserting service images', details: err.message });
        }

        res.json({ message: 'Imágenes de servicio actualizadas con éxito', imageUrls: imageUrls });
      });
    });
  });
});


// ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
// ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//                                      USER

// Ejemplo de cómo manejar la ruta GET para obtener datos del usuario
app.get('/api/user/:id', (req, res) => {
  const userId = req.params.id;
  const sqlQuery = 'SELECT * FROM usuario WHERE id = ?';

  db.query(sqlQuery, [userId], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error en el servidor al obtener el usuario', details: err.message });
      return;
    }
    if (result.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    const user = result[0];
    if (user.foto) {
      user.foto = user.foto.replace(/\\/g, '/');
    }
    res.json(user);
  });
});

// Verificar si el usuario ya se encuentra en la base de datos
// Verificar si el usuario ya se encuentra en la base de datos
app.get("/api/check-user", (req, res) => {
  const email = req.query.email;
  const sqlQuery = "SELECT * FROM usuario WHERE correo = ?";
  db.query(sqlQuery, [email], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Error al verificar el usuario', details: err.message });
    } else {
      res.json({ exists: result.length > 0, user: result[0] || null });
    }
  });
});

app.post("/api/user", (req, res) => {
  const { id, correo, nombre, apellido, edad, phone, foto } = req.body;
  const sqlInsert = "INSERT INTO usuario (id, correo, nombre, apellido, edad, phone, foto) VALUES (?, ?, ?, ?, ?, ?, ?)";
  db.query(sqlInsert, [id, correo, nombre, apellido, edad, phone, foto], (err, result) => {
    if (err) {
      console.error('Error al crear el usuario:', err);
      res.status(500).json({ error: 'Error al crear el usuario', details: err.message });
      return;
    }
    res.status(201).json({ message: "Usuario creado con éxito" });
  });
});


// Actualizar un usuario completamente
app.put('/api/user/:id', (req, res) => {
    const userId = req.params.id;
    const updates = req.body;
    const sqlUpdate = 'UPDATE usuario SET ? WHERE id = ?';
    db.query(sqlUpdate, [updates, userId], (err, result) => {
        if (err) {
            res.status(500).json({ error: 'Error al actualizar el usuario', details: err.message });
        } else {
            res.json({ message: 'Usuario actualizado con éxito' });
        }
    });
});

// Actualizar parcialmente un usuario
// Ejemplo de cómo manejar la ruta PATCH para actualizar datos del usuario
// Actualizar parcialmente un usuario
app.patch('/api/user/:id', (req, res) => {
  const userId = req.params.id;
  const updates = req.body;
  const updateKeys = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const updateValues = Object.values(updates);

  const sqlUpdateUser = `UPDATE usuario SET ${updateKeys} WHERE id = ?`;

  db.query(sqlUpdateUser, [...updateValues, userId], (err, result) => {
    if (err) {
      console.error('Error updating user profile:', err);
      return res.status(500).json({ error: 'Error updating user profile', details: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found or no changes made' });
    }

    if (updates.foto) {
      const profilePic = updates.foto;
      const sqlUpdateService = 'UPDATE Services SET user_img = ? WHERE user_id = ?';
      const sqlUpdateJobs = 'UPDATE Jobs SET user_img = ? WHERE user_id = ?';

      db.query(sqlUpdateService, [profilePic, userId], (err) => {
        if (err) {
          console.error('Error updating service user image:', err);
          return res.status(500).json({ error: 'Error updating service user image', details: err.message });
        }

        db.query(sqlUpdateJobs, [profilePic, userId], (err) => {
          if (err) {
            console.error('Error updating job user image:', err);
            return res.status(500).json({ error: 'Error updating job user image', details: err.message });
          }

          res.json({ message: 'User profile, service images, and job images updated successfully', result });
        });
      });
    } else {
      res.json({ message: 'User profile updated successfully', result });
    }
  });
});


// Eliminar un usuario
app.delete('/api/user/:id', (req, res) => {
    const userId = req.params.id;
    const sqlDelete = 'DELETE FROM usuario WHERE id = ?';
    db.query(sqlDelete, [userId], (err, result) => {
        if (err) {
            console.error('Error al eliminar el usuario:', err);
            res.status(500).json({ error: 'Error al eliminar el usuario', details: err.message });
        } else {
            res.json({ message: 'Usuario eliminado con éxito' });
        }
    });
});


// :::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
// :::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
// :::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//                              SERVICES


// CRUD Operations for Services
// POST - Create a new service




  
// GET - Retrieve all services or a single service by ID
// GET - Retrieve all services
// GET - Retrieve all services for a specific user
// GET - Retrieve all services
// GET - Retrieve all services
app.get("/api/services", (req, res) => {
    const sqlQuery = "SELECT * FROM Services";
    db.query(sqlQuery, (err, results) => {
        if (err) {
            console.error('Error retrieving services:', err);
            res.status(500).json({ error: 'Error retrieving services', details: err.message });
            return;
        }
        res.json(results); // Return all results
    });
});

  // GET - Retrieve services by user_id
  app.get("/api/services/user/:userId", (req, res) => {
    const userId = req.params.userId;
    const sqlQuery = "SELECT * FROM Services WHERE user_id = ?";
    db.query(sqlQuery, [userId], (err, results) => {
      if (err) {
        console.error('Error retrieving services:', err);
        res.status(500).json({ error: 'Error retrieving services', details: err.message });
        return;
      }
      res.json(results);
    });
  });

  

// PUT - Fully update a service
app.put("/api/services/:id", (req, res) => {
    const { user_id, first_name, last_name, dni, phone, address, description, service_type, modalities, status, rating } = req.body;
    const sqlUpdate = "UPDATE Services SET user_id = ?, first_name = ?, last_name = ?, dni = ?, phone = ?, address = ?, description = ?, service_type = ?, modalities = ?, status = ?, rating = ? WHERE id = ?";
    db.query(sqlUpdate, [user_id, first_name, last_name, dni, phone, address, description, service_type, modalities, status, rating, req.params.id], (err, result) => {
        if (err) {
            console.error('Error updating the service:', err);
            return res.status(500).json({ error: 'Error updating the service', details: err.message });
        }
        res.json({ message: 'Service updated successfully' });
    });
});

// POST - Create a new service
// POST - Create a new service
app.post('/api/services', upload.array('serviceImages', 10), (req, res) => {
  const { user_id, dni, phone, address, description, service_type, modalities, status, rating, lat, lng } = req.body;

  // Validate required fields
  if (!user_id || !service_type) {
    return res.status(400).json({ error: "Missing required fields: user_id and service_type must be provided." });
  }

  // Get user details
  const sqlGetUser = 'SELECT nombre, apellido, foto FROM usuario WHERE id = ?';
  db.query(sqlGetUser, [user_id], (err, userResult) => {
    if (err) {
      console.error('Error fetching user details:', err);
      return res.status(500).json({ error: 'Error fetching user details', details: err.message });
    }

    if (userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { nombre, apellido, foto } = userResult[0];
    const user_img = foto || null;  // Set user_img to user's profile picture or null if not available

    const sqlInsertService = `
      INSERT INTO Services (user_id, first_name, last_name, dni, phone, address, description, service_type, modalities, status, rating, lat, lng, user_img) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [user_id, nombre, apellido, dni, phone, address, description, service_type, modalities, status, rating, lat, lng, user_img];

    db.query(sqlInsertService, values, (err, result) => {
      if (err) {
        console.error('Error creating service:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }

      const serviceId = result.insertId;
      const serviceImages = req.files.map(file => `/uploads/${file.filename}`);
      if (serviceImages.length > 0) {
        const sqlInsertImages = 'INSERT INTO ServiceImages (service_id, image_url) VALUES ?';
        const imageValues = serviceImages.map(url => [serviceId, url]);
        db.query(sqlInsertImages, [imageValues], (err) => {
          if (err) {
            console.error('Error inserting service images:', err);
            return res.status(500).json({ error: 'Error inserting service images', details: err.message });
          }
          res.json({ message: "Service created successfully", serviceId: serviceId });
        });
      } else {
        res.json({ message: "Service created successfully", serviceId: serviceId });
      }
    });
  });
});

// Verificar si los datos comunes del usuario existen
app.get('/api/check-common-data/:userId', (req, res) => {
  const userId = req.params.userId;
  const sqlQuery = 'SELECT dni, phone FROM usuario WHERE id = ?';

  db.query(sqlQuery, [userId], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error en el servidor al obtener los datos del usuario', details: err.message });
      return;
    }
    if (result.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    const userData = result[0];
    res.json({
      dni: userData.dni || '',
      phone: userData.phone || ''
    });
  });
});


// PATCH - Partially update a service
// PATCH - Partially update a service
app.patch('/api/services/:serviceId', upload.array('serviceImages', 10), (req, res) => {
  const serviceId = parseInt(req.params.serviceId, 10); // Asegúrate de que serviceId es un entero
  if (isNaN(serviceId)) {
    return res.status(400).json({ error: 'Invalid service ID' });
  }

  const updates = req.body;
  const validColumns = ['dni', 'phone', 'address', 'description', 'service_type', 'modalities', 'status', 'lat', 'lng', 'user_img'];
  const columnsToUpdate = Object.keys(updates).filter(key => validColumns.includes(key));

  if (columnsToUpdate.length === 0) {
    console.error('No valid columns to update');
    return res.status(400).json({ error: 'No valid columns to update' });
  }

  const sqlUpdateService = `
    UPDATE Services SET ${columnsToUpdate.map(col => `${col} = ?`).join(', ')}
    WHERE id = ?`;

  const values = [...columnsToUpdate.map(col => updates[col]), serviceId];

  db.query(sqlUpdateService, values, (err, result) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      return res.status(500).json({ error: 'Error updating service', details: err.message });
    }

    if (req.files.length > 0) {
      const serviceImages = req.files.map(file => `/uploads/${file.filename}`);
      const sqlInsertImages = 'INSERT INTO ServiceImages (service_id, image_url) VALUES ?';
      const imageValues = serviceImages.map(url => [serviceId, url]);

      db.query(sqlInsertImages, [imageValues], (err) => {
        if (err) {
          console.error('Error inserting service images:', err);
          return res.status(500).json({ error: 'Error inserting service images', details: err.message });
        }
        res.json({ message: 'Service updated successfully', result });
      });
    } else {
      res.json({ message: 'Service updated successfully', result });
    }
  });
});

app.get("/api/services/:id", (req, res) => {
  const serviceId = req.params.id;
  const sqlQuery = `
    SELECT s.*, GROUP_CONCAT(i.image_url) as images 
    FROM Services s 
    LEFT JOIN ServiceImages i ON s.id = i.service_id 
    WHERE s.id = ? 
    GROUP BY s.id`;

  db.query(sqlQuery, [serviceId], (err, results) => {
    if (err) {
      console.error('Error retrieving service details:', err);
      res.status(500).json({ error: 'Error retrieving service details', details: err.message });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }
    const service = results[0];
    if (service.images) {
      service.images = service.images.split(',');
    } else {
      service.images = [];
    }
    res.json(service);
  });
});

// DELETE - Remove a service
app.delete("/api/services/:id", (req, res) => {
    const sqlDelete = "DELETE FROM Services WHERE id = ?";
    db.query(sqlDelete, [req.params.id], (err, result) => {
        if (err) {
            console.error('Error al eliminar el servicio:', err);
            res.status(500).json({ error: 'Error al eliminar el servicio', details: err.message });
            return;
        }
        res.json({ message: 'Servicio eliminado con éxito' });
    });
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
// Endpoint para enviar una calificación
// Endpoint para enviar una calificación
// Endpoint para enviar una calificación
// Endpoint para enviar una calificación
// Endpoint para enviar una calificación
// GET - Retrieve a specific rating by user and service
// Endpoint para enviar una calificación
// Endpoint para enviar una calificación

// Endpoint para enviar una calificación
app.post('/api/ratings', (req, res) => {
    const { serviceId, jobId, userId, rating } = req.body;
  
    if (!userId || (!serviceId && !jobId)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
  
    const sqlCheckRating = 'SELECT * FROM ratings WHERE (service_id = ? OR job_id = ?) AND user_id = ?';
    const sqlInsertRating = 'INSERT INTO ratings (service_id, job_id, user_id, rating) VALUES (?, ?, ?, ?)';
    const sqlUpdateRating = 'UPDATE ratings SET rating = ? WHERE (service_id = ? OR job_id = ?) AND user_id = ?';
  
    const sqlUpdateServiceRating = `
      UPDATE Services
      SET rating = (
        SELECT AVG(r.rating)
        FROM ratings r
        WHERE r.service_id = ?
      )
      WHERE id = ?`;
  
    const sqlUpdateJobRating = `
      UPDATE jobs
      SET rating = (
        SELECT AVG(r.rating)
        FROM ratings r
        WHERE r.job_id = ?
      )
      WHERE id = ?`;
  
    db.query(sqlCheckRating, [serviceId, jobId, userId], (err, result) => {
      if (err) {
        console.error('Error checking rating:', err);
        return res.status(500).json({ error: 'Error checking rating', details: err.message });
      }
  
      if (result.length > 0) {
        db.query(sqlUpdateRating, [rating, serviceId, jobId, userId], (err, result) => {
          if (err) {
            console.error('Error updating rating:', err);
            return res.status(500).json({ error: 'Error updating rating', details: err.message });
          }
  
          if (serviceId) {
            db.query(sqlUpdateServiceRating, [serviceId, serviceId], (err, result) => {
              if (err) {
                console.error('Error updating service rating:', err);
                return res.status(500).json({ error: 'Error updating service rating', details: err.message });
              }
              res.json({ message: 'Rating updated and service rating updated successfully' });
            });
          } else if (jobId) {
            db.query(sqlUpdateJobRating, [jobId, jobId], (err, result) => {
              if (err) {
                console.error('Error updating job rating:', err);
                return res.status(500).json({ error: 'Error updating job rating', details: err.message });
              }
              res.json({ message: 'Rating updated and job rating updated successfully' });
            });
          }
        });
      } else {
        db.query(sqlInsertRating, [serviceId, jobId, userId, rating], (err, result) => {
          if (err) {
            console.error('Error inserting rating:', err);
            return res.status(500).json({ error: 'Error inserting rating', details: err.message });
          }
  
          if (serviceId) {
            db.query(sqlUpdateServiceRating, [serviceId, serviceId], (err, result) => {
              if (err) {
                console.error('Error updating service rating:', err);
                return res.status(500).json({ error: 'Error updating service rating', details: err.message });
              }
              res.json({ message: 'Rating submitted and service rating updated successfully' });
            });
          } else if (jobId) {
            db.query(sqlUpdateJobRating, [jobId, jobId], (err, result) => {
              if (err) {
                console.error('Error updating job rating:', err);
                return res.status(500).json({ error: 'Error updating job rating', details: err.message });
              }
              res.json({ message: 'Rating submitted and job rating updated successfully' });
            });
          }
        });
      }
    });
  });

// GET - Retrieve a specific rating by user and service
app.get('/api/ratings/:serviceId/user/:userId', (req, res) => {
    const { serviceId, userId } = req.params;
    const sqlGetUserRating = 'SELECT rating FROM ratings WHERE service_id = ? AND user_id = ?';

    db.query(sqlGetUserRating, [serviceId, userId], (err, result) => {
        if (err) {
            console.error('Error getting user rating:', err);
            return res.status(500).json({ error: 'Error getting user rating', details: err.message });
        }

        if (result.length > 0) {
            res.json(result[0]);
        } else {
            res.status(404).json({ error: 'Rating not found' });
        }
    });
});

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::.
//:::::::::::::::::::::::::::::::::::::::::::::::::::::::.
//:::::::::::::::::::::::::::::::::::::::::::::::::::::::.
//                JOBS
// Obtener todos los trabajos
app.get('/api/jobs', (req, res) => {
    const sql = 'SELECT * FROM jobs';
    db.query(sql, (err, results) => {
      if (err) {
        console.error('Error fetching jobs:', err);
        return res.status(500).json({ error: 'Error fetching jobs' });
      }
      res.json(results);
    });
  });
  
  // Obtener trabajos por usuario
  app.get('/api/jobs/user/:userId', (req, res) => {
    const userId = req.params.userId;
    const sql = 'SELECT * FROM jobs WHERE user_id = ?';
    db.query(sql, [userId], (err, results) => {
      if (err) {
        console.error('Error fetching jobs for user:', err);
        return res.status(500).json({ error: 'Error fetching jobs for user' });
      }
      res.json(results);
    });
  });
  
  // Obtener detalles de un trabajo específico con imágenes
app.get('/api/jobs/:id', (req, res) => {
  const jobId = req.params.id;
  const sqlQuery = `
    SELECT j.*, GROUP_CONCAT(i.image_url) as images 
    FROM jobs j 
    LEFT JOIN JobImages i ON j.id = i.job_id 
    WHERE j.id = ? 
    GROUP BY j.id`;

  db.query(sqlQuery, [jobId], (err, results) => {
    if (err) {
      console.error('Error retrieving job details:', err);
      return res.status(500).json({ error: 'Error retrieving job details', details: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    const job = results[0];
    if (job.images) {
      job.images = job.images.split(',');
    } else {
      job.images = [];
    }
    res.json(job);
  });
});
  
 // Crear un nuevo trabajo
// Crear un nuevo trabajo
// Crear un nuevo trabajo
// Crear un nuevo trabajo
// index.js
// Crear un nuevo trabajo
// Crear un nuevo trabajo
app.post('/api/jobs', upload.array('jobImages', 10), (req, res) => {
  const { user_id, job_title, description, company, location, lat, lng, job_type, salary, salary_frequency } = req.body;

  console.log('Request Body:', req.body);
  console.log('Uploaded Files:', req.files);

  if (!user_id || !job_title || !description || !job_type || !salary || !salary_frequency) {
    return res.status(400).json({ error: 'Required fields are missing' });
  }

  // Primero, obtener la imagen del usuario desde la tabla users
  const sqlGetUserImage = 'SELECT foto AS user_img FROM usuario WHERE id = ?';

  db.query(sqlGetUserImage, [user_id], (err, result) => {
    if (err) {
      console.error('Error fetching user image:', err);
      return res.status(500).json({ error: 'Error fetching user image' });
    }

    const user_img = result.length > 0 ? result[0].user_img : 'default.png';

    // Luego, insertar el nuevo trabajo con la imagen del usuario
    const sqlInsertJob = 'INSERT INTO jobs (user_id, job_title, description, company, location, lat, lng, job_type, salary, salary_frequency, user_img) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(sqlInsertJob, [user_id, job_title, description, company, location, lat, lng, job_type, salary, salary_frequency, user_img], (err, result) => {
      if (err) {
        console.error('Error creating job:', err);
        return res.status(500).json({ error: 'Error creating job' });
      }
      const jobId = result.insertId;

      // Insertar las imágenes del trabajo
      const jobImages = req.files.map(file => `/uploads/${file.filename}`);
      if (jobImages.length > 0) {
        const sqlInsertImages = 'INSERT INTO JobImages (job_id, image_url) VALUES ?';
        const imageValues = jobImages.map(url => [jobId, url]);
        db.query(sqlInsertImages, [imageValues], (err) => {
          if (err) {
            console.error('Error inserting job images:', err);
            return res.status(500).json({ error: 'Error inserting job images', details: err.message });
          }

          // Enviar notificaciones a los suscriptores
          sendNotifications(user_id, job_title);

          res.json({ message: "Job created successfully", jobId: jobId });
        });
      } else {
        // Enviar notificaciones a los suscriptores
        sendNotifications(user_id, job_title);

        res.json({ message: "Job created successfully", jobId: jobId });
      }
    });
  });
});



  
 // Actualizar un trabajo
app.patch('/api/jobs/:id', upload.array('jobImages', 10), (req, res) => {
  const jobId = req.params.id;
  const updates = req.body;
  const validColumns = ['job_title', 'description', 'company', 'location', 'lat', 'lng', 'job_type', 'salary', 'salary_frequency'];
  const columnsToUpdate = Object.keys(updates).filter(key => validColumns.includes(key));

  if (columnsToUpdate.length === 0) {
    console.error('No valid columns to update');
    return res.status(400).json({ error: 'No valid columns to update' });
  }

  const sqlUpdateJob = `
    UPDATE jobs SET ${columnsToUpdate.map(col => `${col} = ?`).join(', ')}
    WHERE id = ?`;

  const values = [...columnsToUpdate.map(col => updates[col]), jobId];

  db.query(sqlUpdateJob, values, (err, result) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      return res.status(500).json({ error: 'Error updating job', details: err.message });
    }

    const jobImages = req.files.map(file => `/uploads/${file.filename}`);
    if (jobImages.length > 0) {
      const sqlInsertImages = 'INSERT INTO JobImages (job_id, image_url) VALUES ?';
      const imageValues = jobImages.map(url => [jobId, url]);
      db.query(sqlInsertImages, [imageValues], (err) => {
        if (err) {
          console.error('Error inserting job images:', err);
          return res.status(500).json({ error: 'Error inserting job images', details: err.message });
        }
        res.json({ message: 'Job updated successfully', result });
      });
    } else {
      res.json({ message: 'Job updated successfully', result });
    }
  });
});
  
  // Eliminar un trabajo
  app.delete('/api/jobs/:id', (req, res) => {
    const jobId = req.params.id;
    const sql = 'DELETE FROM jobs WHERE id = ?';
    db.query(sql, [jobId], (err, result) => {
      if (err) {
        console.error('Error deleting job:', err);
        return res.status(500).json({ error: 'Error deleting job' });
      }
      console.log('Job deleted successfully', { jobId });
      res.json({ message: 'Job deleted successfully' });
    });
  });
  
  // Obtener calificación del usuario para un trabajo específico
app.get('/api/ratings/job/:jobId/user/:userId', (req, res) => {
    const { jobId, userId } = req.params;
    const sql = 'SELECT * FROM ratings WHERE job_id = ? AND user_id = ?';
    db.query(sql, [jobId, userId], (err, results) => {
        if (err) {
            console.error('Error fetching user rating:', err);
            return res.status(500).json({ error: 'Error fetching user rating' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'No rating found for this user and job' });
        }
        res.json(results[0]);
    });
});

// Obtener calificación del usuario para un servicio específico
app.get('/api/ratings/service/:serviceId/user/:userId', (req, res) => {
    const { serviceId, userId } = req.params;
    const sql = 'SELECT * FROM ratings WHERE service_id = ? AND user_id = ?';
    db.query(sql, [serviceId, userId], (err, results) => {
        if (err) {
            console.error('Error fetching user rating:', err);
            return res.status(500).json({ error: 'Error fetching user rating' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'No rating found for this user and service' });
        }
        res.json(results[0]);
    });
});

// sk-proj-ZurfRXMcevYmtDFyjCNAT3BlbkFJmnfitBgU47350GoNFBb6
// Endpoint para obtener los cursos
app.get('/api/courses', (req, res) => {
  const query = 'SELECT * FROM courses';
  db.query(query, (error, results) => {
      if (error) {
          console.error('Error fetching courses:', error);
          res.status(500).json({ error: 'Internal Server Error' });
      } else {
          res.json(results);
      }
  });
});

// Endpoint para añadir un curso con una imagen
app.post('/api/courses', upload.single('thumbnail'), (req, res) => {
  const { title, description, instructor, price, original_price, rating, rating_count, category, is_bestseller } = req.body;
  const thumbnail = req.file.path;

  cloudinary.uploader.upload(thumbnail, { resource_type: 'image' })
      .then(result => {
          const thumbnail_url = result.secure_url;
          const query = 'INSERT INTO courses (title, description, instructor, price, original_price, rating, rating_count, category, thumbnail_url, is_bestseller) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
          db.query(query, [title, description, instructor, price, original_price, rating, rating_count, category, thumbnail_url, is_bestseller], (error, results) => {
              if (error) {
                  console.error('Error inserting course:', error);
                  res.status(500).json({ error: 'Internal Server Error' });
              } else {
                  res.status(201).json({ message: 'Course added successfully', courseId: results.insertId });
              }
          });
      })
      .catch(error => {
          console.error('Error uploading image to Cloudinary:', error);
          res.status(500).json({ error: 'Error uploading image' });
      });
});



// :::::::::::::::::::::::::::::::::.COMENTARIOS:::::::::::::::::::::::.....
//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
// Obtener comentarios y respuestas
// Obtener comentarios y usuarios con imagen
// Obtener comentarios y sus respuestas
app.get('/api/services/:id/comments', (req, res) => {
  const serviceId = req.params.id;
  const sql = `
    SELECT c.*, u.foto as user_img FROM Comments c
    LEFT JOIN usuario u ON c.user_id = u.id
    WHERE c.service_id = ? AND c.parent_id IS NULL
    ORDER BY c.created_at DESC;
  `;

  db.query(sql, [serviceId], (err, comments) => {
    if (err) {
      console.error('Error fetching comments:', err);
      return res.status(500).json({ error: 'Error fetching comments' });
    }

    const commentIds = comments.map(comment => comment.id);

    if (commentIds.length > 0) {
      const repliesSql = `
        SELECT r.*, u.foto as user_img FROM Comments r
        LEFT JOIN usuario u ON r.user_id = u.id
        WHERE r.parent_id IN (?)
        ORDER BY r.created_at DESC;
      `;
      
      db.query(repliesSql, [commentIds], (err, replies) => {
        if (err) {
          console.error('Error fetching replies:', err);
          return res.status(500).json({ error: 'Error fetching replies' });
        }

        // Map replies to their respective parent comments
        const repliesGroupedByParent = replies.reduce((acc, reply) => {
          if (!acc[reply.parent_id]) {
            acc[reply.parent_id] = [];
          }
          acc[reply.parent_id].push(reply);
          return acc;
        }, {});

        // Attach replies to their respective parent comments
        const commentsWithReplies = comments.map(comment => ({
          ...comment,
          replies: repliesGroupedByParent[comment.id] || []
        }));

        res.json(commentsWithReplies);
      });
    } else {
      res.json(comments);
    }
  });
});


// Agregar un nuevo comentario
app.post('/api/comments', (req, res) => {
  const { serviceId, userId, userName, comment } = req.body;
  const sql = 'INSERT INTO Comments (service_id, user_id, user_name, comment, created_at) VALUES (?, ?, ?, ?, NOW())';
  db.query(sql, [serviceId, userId, userName, comment], (err, result) => {
    if (err) {
      console.error('Error adding comment:', err);
      return res.status(500).json({ error: 'Error adding comment' });
    }
    res.json({ message: 'Comment added successfully' });
  });
});

// Like a comment
app.patch('/api/comments/:id/like', (req, res) => {
  const commentId = req.params.id;
  const { userId } = req.body;

  db.query('SELECT liked FROM CommentLikes WHERE comment_id = ? AND user_id = ?', [commentId, userId], (err, results) => {
    if (err) {
      console.error('Error fetching like status:', err);
      return res.status(500).json({ error: 'Error fetching like status' });
    }

    if (results.length > 0) {
      const { liked } = results[0];
      if (liked) {
        db.query('DELETE FROM CommentLikes WHERE comment_id = ? AND user_id = ?', [commentId, userId], (err) => {
          if (err) {
            console.error('Error removing like:', err);
            return res.status(500).json({ error: 'Error removing like' });
          }
          db.query('UPDATE Comments SET likes = likes - 1 WHERE id = ?', [commentId], (err) => {
            if (err) {
              console.error('Error updating like count:', err);
              return res.status(500).json({ error: 'Error updating like count' });
            }
            res.json({ message: 'Like removed' });
          });
        });
      } else {
        db.query('UPDATE CommentLikes SET liked = 1 WHERE comment_id = ? AND user_id = ?', [commentId, userId], (err) => {
          if (err) {
            console.error('Error updating like status:', err);
            return res.status(500).json({ error: 'Error updating like status' });
          }
          db.query('UPDATE Comments SET likes = likes + 1, dislikes = dislikes - 1 WHERE id = ?', [commentId], (err) => {
            if (err) {
              console.error('Error updating counts:', err);
              return res.status(500).json({ error: 'Error updating counts' });
            }
            res.json({ message: 'Liked' });
          });
        });
      }
    } else {
      db.query('INSERT INTO CommentLikes (comment_id, user_id, liked) VALUES (?, ?, 1)', [commentId, userId], (err) => {
        if (err) {
          console.error('Error inserting like:', err);
          return res.status(500).json({ error: 'Error inserting like' });
        }
        db.query('UPDATE Comments SET likes = likes + 1 WHERE id = ?', [commentId], (err) => {
          if (err) {
            console.error('Error updating like count:', err);
            return res.status(500).json({ error: 'Error updating like count' });
          }
          res.json({ message: 'Liked' });
        });
      });
    }
  });
});

// Dislike a comment
app.patch('/api/comments/:id/dislike', (req, res) => {
  const commentId = req.params.id;
  const { userId } = req.body;

  db.query('SELECT liked FROM CommentLikes WHERE comment_id = ? AND user_id = ?', [commentId, userId], (err, results) => {
    if (err) {
      console.error('Error fetching like status:', err);
      return res.status(500).json({ error: 'Error fetching like status' });
    }

    if (results.length > 0) {
      const { liked } = results[0];
      if (!liked) {
        db.query('DELETE FROM CommentLikes WHERE comment_id = ? AND user_id = ?', [commentId, userId], (err) => {
          if (err) {
            console.error('Error removing dislike:', err);
            return res.status(500).json({ error: 'Error removing dislike' });
          }
          db.query('UPDATE Comments SET dislikes = dislikes - 1 WHERE id = ?', [commentId], (err) => {
            if (err) {
              console.error('Error updating dislike count:', err);
              return res.status(500).json({ error: 'Error updating dislike count' });
            }
            res.json({ message: 'Dislike removed' });
          });
        });
      } else {
        db.query('UPDATE CommentLikes SET liked = 0 WHERE comment_id = ? AND user_id = ?', [commentId, userId], (err) => {
          if (err) {
            console.error('Error updating like status:', err);
            return res.status(500).json({ error: 'Error updating like status' });
          }
          db.query('UPDATE Comments SET likes = likes - 1, dislikes = dislikes + 1 WHERE id = ?', [commentId], (err) => {
            if (err) {
              console.error('Error updating counts:', err);
              return res.status(500).json({ error: 'Error updating counts' });
            }
            res.json({ message: 'Disliked' });
          });
        });
      }
    } else {
      db.query('INSERT INTO CommentLikes (comment_id, user_id, liked) VALUES (?, ?, 0)', [commentId, userId], (err) => {
        if (err) {
          console.error('Error inserting dislike:', err);
          return res.status(500).json({ error: 'Error inserting dislike' });
        }
        db.query('UPDATE Comments SET dislikes = dislikes + 1 WHERE id = ?', [commentId], (err) => {
          if (err) {
            console.error('Error updating dislike count:', err);
            return res.status(500).json({ error: 'Error updating dislike count' });
          }
          res.json({ message: 'Disliked' });
        });
      });
    }
  });
});

// Obtener respuestas a un comentario
app.get('/api/comments/:id/replies', (req, res) => {
  const commentId = req.params.id;
  const sql = 'SELECT * FROM Comments WHERE parent_id = ? ORDER BY created_at DESC';
  db.query(sql, [commentId], (err, results) => {
    if (err) {
      console.error('Error fetching replies:', err);
      return res.status(500).json({ error: 'Error fetching replies' });
    }
    res.json(results);
  });
});

// Agregar una nueva respuesta a un comentario
app.post('/api/comments/:id/reply', (req, res) => {
  const { serviceId, userId, userName, comment } = req.body;
  const parentId = req.params.id;
  const sql = 'INSERT INTO Comments (service_id, user_id, user_name, comment, parent_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())';
  db.query(sql, [serviceId, userId, userName, comment, parentId], (err, result) => {
    if (err) {
      console.error('Error adding reply:', err);
      return res.status(500).json({ error: 'Error adding reply' });
    }
    res.json({ message: 'Reply added successfully' });
  });
});


//::::::::::::::::::::::::::. busqueda de sugerencias:::::::::::::::::::::::....
//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
// Endpoint para obtener sugerencias de títulos de trabajos
// Obtener títulos de trabajos
// Ruta para obtener los títulos de los trabajos
app.get('/api/jobs/titles', (_req, res) => {
  const sql = 'SELECT job_title FROM jobs';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching job titles:', err);
      return res.status(500).json({ error: 'Error fetching job titles' });
    }
    const jobTitles = results.map(row => row.job_title);
    res.json(jobTitles);
  });
});
