const express = require('express');
const router = express.Router();
const db = require('./db'); // Asegúrate de que `db` es la conexión a tu base de datos

// Middleware de autenticación
const { isAuthenticated } = require('./middleware/auth');

// Suscribirse a un usuario
router.post('/subscribe', isAuthenticated, (req, res) => {
    const { publisherId } = req.body;
    const subscriberId = req.user.id;

    const sql = 'INSERT INTO Subscriptions (subscriber_id, publisher_id) VALUES (?, ?)';
    db.query(sql, [subscriberId, publisherId], (err, result) => {
        if (err) {
            console.error('Error creating subscription:', err);
            return res.status(500).json({ error: 'Error creating subscription', details: err.message });
        }
        res.status(201).json({ message: 'Subscribed successfully' });
    });
});

// Obtener suscripciones de un usuario
router.get('/subscriptions', isAuthenticated, (req, res) => {
    const subscriberId = req.user.id;

    const sql = 'SELECT * FROM Subscriptions WHERE subscriber_id = ?';
    db.query(sql, [subscriberId], (err, results) => {
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
router.get('/notifications', isAuthenticated, (req, res) => {
    const userId = req.user.id;

    const sql = 'SELECT * FROM Notifications WHERE user_id = ? AND is_read = FALSE';
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching notifications:', err);
            return res.status(500).json({ error: 'Error fetching notifications', details: err.message });
        }
        res.json(results);
    });
});

// Marcar notificaciones como leídas
router.post('/notifications/mark-read', isAuthenticated, (req, res) => {
    const userId = req.user.id;

    const sql = 'UPDATE Notifications SET is_read = TRUE WHERE user_id = ?';
    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error('Error marking notifications as read:', err);
            return res.status(500).json({ error: 'Error marking notifications as read', details: err.message });
        }
        res.json({ message: 'Notifications marked as read' });
    });
});

module.exports = router;
