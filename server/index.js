const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const upload = require('./uploadConfig');  // Importa la configuración de multer
app.use('/uploads', express.static('uploads'));
app.use(express.json());
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const admin = require('./firebaseconfig'); // Importa la configuración de Firebase Admin SDK

const PORT = process.env.PORT || 3001;
app.use(cors());
app.use(bodyParser.json());



// Conexión a MySQL
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Mauricio_nets4",
    database: "perfilusuario"
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to the database: ' + err.stack);
        return;
    }
    console.log('Connected to database with thread ID: ' + db.threadId);
});

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

  // Extraer información del correo electrónico
  const userInfo = extractUserInfoFromEmail(email);

  // Almacenar el código de verificación temporalmente en memoria
  global.verificationStore = global.verificationStore || {};
  global.verificationStore[email] = { password, verificationCode, ...userInfo };

  transporter.sendMail({
    from: 'jobnnest@gmail.com',
    to: email,
    subject: 'Código de verificación',
    text: `Tu código de verificación es: ${verificationCode}`
  }, (err, info) => {
    if (err) {
      console.error('Error sending email:', err);
      return res.status(500).json({ message: 'Failed to send verification email.', error: err.message });
    }
    res.status(200).json({ message: 'Usuario registrado. Por favor, verifica tu correo electrónico.' });
  });
});

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

      const sqlInsertUsuario = 'INSERT INTO usuario (id, correo, nombre, apellido, edad, direccion, foto) VALUES (?, ?, ?, ?, ?, ?, ?)';
      db.query(sqlInsertUsuario, [userRecord.uid, email, storedData.nombre, storedData.apellido, 0, 'sin direccion', null], (err, result) => {
        if (err) {
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

// ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
// ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//                                  IMAGE    

// Endpoint de carga de imagen
app.post('/api/upload', upload.single('profilePic'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    
    const userId = req.body.userId;
    const sqlUpdateUser = 'UPDATE usuario SET foto = ? WHERE id = ?';
    const sqlUpdateService = 'UPDATE services SET user_img = ? WHERE user_id = ?';

    db.query(sqlUpdateUser, [imageUrl, userId], (err) => {
        if (err) {
            console.error('Error updating user image:', err);
            return res.status(500).json({ error: 'Error updating user image', details: err.message });
        }

        db.query(sqlUpdateService, [imageUrl, userId], (err) => {
            if (err) {
                console.error('Error updating service image:', err);
                return res.status(500).json({ error: 'Error updating service image', details: err.message });
            }

            res.json({ message: 'Imagen de perfil y servicio actualizada con éxito', imageUrl: imageUrl });
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
            user.foto = user.foto.replace(/\\/g, '/');  // Reemplaza todas las barras invertidas con barras normales
        }
        res.json(user);
    });
});

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
    const { id, correo, nombre, apellido, edad, direccion } = req.body;
    const sqlInsert = "INSERT INTO usuario (id, correo, nombre, apellido, edad, direccion) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(sqlInsert, [id, correo, nombre, apellido, edad, direccion], (err, result) => {
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
app.patch('/api/user/:id', (req, res) => {
    const userId = req.params.id;
    const updates = req.body;
    const updateKeys = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const updateValues = Object.values(updates);

    const sqlUpdate = `UPDATE usuario SET ${updateKeys} WHERE id = ?`;

    db.query(sqlUpdate, [...updateValues, userId], (err, result) => {
        if (err) {
            console.error('Error al actualizar el usuario:', err);
            return res.status(500).json({ error: 'Error al actualizar el usuario', details: err.message });
        }
        if (result.affectedRows === 0) {
            // No se encontró el usuario con ese ID, o no se cambió nada
            return res.status(404).json({ error: 'Usuario no encontrado o no se modificó ningún dato' });
        }
        res.json({ message: 'Usuario actualizado con éxito', result: result });
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
    const { user_id, first_name, last_name, dni, phone, address, description, service_type, modalities, cost, status, rating } = req.body;
    const sqlUpdate = "UPDATE Services SET user_id = ?, first_name = ?, last_name = ?, dni = ?, phone = ?, address = ?, description = ?, service_type = ?, modalities = ?, cost = ?, status = ?, rating = ? WHERE id = ?";
    db.query(sqlUpdate, [user_id, first_name, last_name, dni, phone, address, description, service_type, modalities, cost, status, rating, req.params.id], (err, result) => {
        if (err) {
            console.error('Error updating the service:', err);
            return res.status(500).json({ error: 'Error updating the service', details: err.message });
        }
        res.json({ message: 'Service updated successfully' });
    });
});

// POST - Create a new service
app.post('/api/services', (req, res) => {
    const { user_id, dni, phone, address, description, service_type, modalities, cost, status, rating, lat, lng, user_img } = req.body;

    // Validate required fields
    if (!user_id || !service_type) {
      return res.status(400).json({ error: "Missing required fields: user_id and service_type must be provided." });
    }

    // Get user details
    const sqlGetUser = 'SELECT nombre, apellido FROM usuario WHERE id = ?';
    db.query(sqlGetUser, [user_id], (err, userResult) => {
        if (err) {
            console.error('Error fetching user details:', err);
            return res.status(500).json({ error: 'Error fetching user details', details: err.message });
        }
        
        if (userResult.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { nombre, apellido } = userResult[0];

        const sqlInsertService = `
            INSERT INTO Services (user_id, first_name, last_name, dni, phone, address, description, service_type, modalities, cost, status, rating, lat, lng, user_img) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const values = [user_id, nombre, apellido, dni, phone, address, description, service_type, modalities, cost, status, rating, lat, lng, user_img];

        db.query(sqlInsertService, values, (err, result) => {
            if (err) {
                console.error('Error creating service:', err);
                return res.status(500).json({ error: 'Database error', details: err.message });
            }
            res.json({ message: "Service created successfully", serviceId: result.insertId });
        });
    });
});

// PATCH - Partially update a service
app.patch('/api/services/:serviceId', (req, res) => {
    const serviceId = req.params.serviceId;
    const updates = req.body;
    const validColumns = ['dni', 'phone', 'address', 'description', 'service_type', 'modalities', 'cost', 'status', 'lat', 'lng', 'user_img'];
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

        res.json({ message: 'Service updated successfully', result });
    });
});

app.get("/api/services/:id", (req, res) => {
    const sqlQuery = "SELECT * FROM Services WHERE id = ?";
    db.query(sqlQuery, [parseInt(req.params.id, 10)], (err, results) => {
        if (err) {
            console.error('Error retrieving service:', err);
            res.status(500).json({ error: 'Error retrieving service', details: err.message });
            return;
        }
        if (results.length === 0) {
            res.status(404).json({ error: 'Service not found' });
            return;
        }
        res.json(results[0]); // Return the first result
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
  
  // Obtener detalles de un trabajo específico
  app.get('/api/jobs/:id', (req, res) => {
    const jobId = req.params.id;
    console.log(`Fetching details for job ID: ${jobId}`);
    const sql = 'SELECT * FROM jobs WHERE id = ?';
    db.query(sql, [jobId], (err, results) => {
      if (err) {
        console.error('Error fetching job details:', err);
        return res.status(500).json({ error: 'Error fetching job details' });
      }
      if (results.length === 0) {
        console.log(`Job ID: ${jobId} not found`);
        return res.status(404).json({ error: 'Job not found' });
      }
      console.log(`Job details for ID: ${jobId}`, results[0]);
      res.json(results[0]);
    });
  });
  
 // Crear un nuevo trabajo
// Crear un nuevo trabajo
app.post('/api/jobs', (req, res) => {
    const { user_id, job_title, description, company, location, lat, lng, job_type, salary } = req.body;
  
    if (!user_id || !job_title || !description || !job_type) {
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
      const sqlInsertJob = 'INSERT INTO jobs (user_id, job_title, description, company, location, lat, lng, job_type, salary, user_img) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
      db.query(sqlInsertJob, [user_id, job_title, description, company, location, lat, lng, job_type, salary, user_img], (err, result) => {
        if (err) {
          console.error('Error creating job:', err);
          return res.status(500).json({ error: 'Error creating job' });
        }
        res.json({ message: 'Job created successfully', jobId: result.insertId });
      });
    });
  });
  
  
  // Actualizar un trabajo
  app.patch('/api/jobs/:id', (req, res) => {
    const jobId = req.params.id;
    const updates = req.body;
    const sql = 'UPDATE jobs SET ? WHERE id = ?';
    db.query(sql, [updates, jobId], (err, result) => {
      if (err) {
        console.error('Error updating job:', err);
        return res.status(500).json({ error: 'Error updating job' });
      }
      console.log('Job updated successfully', { jobId });
      res.json({ message: 'Job updated successfully' });
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