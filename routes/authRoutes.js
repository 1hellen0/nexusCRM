'use strict';

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// Rutas públicas de autenticación
router.post('/register', authController.register);
router.post('/login', authController.login);

// Ruta protegida de perfil
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;

