'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const ALLOWED_REGISTER_FIELDS = ['nombre', 'correo', 'password'];
const ALLOWED_LOGIN_FIELDS = ['correo', 'password'];

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error('Configuración de seguridad inválida: JWT_SECRET ausente o insuficiente.');
  }
  return secret.trim();
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '8h';
}

function checkDisallowedFields(body, allowedList) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return 'El cuerpo de la solicitud debe ser un objeto JSON válido.';
  }
  const keys = Object.keys(body);
  for (const key of keys) {
    if (!allowedList.includes(key)) {
      return `El campo '${key}' no está permitido.`;
    }
  }
  return null;
}

const authController = {
  async register(req, res) {
    try {
      const disallowed = checkDisallowedFields(req.body, ALLOWED_REGISTER_FIELDS);
      if (disallowed) {
        return res.status(400).json({
          status: 'error',
          message: disallowed
        });
      }

      const { nombre, correo, password } = req.body;

      if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
        return res.status(400).json({
          status: 'error',
          message: 'El nombre es obligatorio.'
        });
      }
      if (nombre.trim().length > 120) {
        return res.status(400).json({
          status: 'error',
          message: 'El nombre no puede superar los 120 caracteres.'
        });
      }

      if (!correo || typeof correo !== 'string' || correo.trim() === '') {
        return res.status(400).json({
          status: 'error',
          message: 'El correo electrónico es obligatorio.'
        });
      }
      const normalizedEmail = correo.trim().toLowerCase();
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        return res.status(400).json({
          status: 'error',
          message: 'El formato del correo electrónico es inválido.'
        });
      }
      if (normalizedEmail.length > 150) {
        return res.status(400).json({
          status: 'error',
          message: 'El correo electrónico no puede superar los 150 caracteres.'
        });
      }

      if (!password || typeof password !== 'string') {
        return res.status(400).json({
          status: 'error',
          message: 'La contraseña es obligatoria.'
        });
      }
      if (password.length < 8) {
        return res.status(400).json({
          status: 'error',
          message: 'La contraseña debe contener al menos 8 caracteres.'
        });
      }

      // Comprobar correo único previo
      const existingUser = await Usuario.findOne({ where: { correo: normalizedEmail } });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'El correo electrónico ya está registrado.'
        });
      }

      // Hash seguro con bcryptjs (cost factor 10)
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      const nuevoUsuario = await Usuario.create({
        nombre: nombre.trim(),
        correo: normalizedEmail,
        password_hash
      });

      return res.status(201).json({
        status: 'success',
        message: 'Usuario registrado exitosamente.',
        data: {
          id_usuario: nuevoUsuario.id_usuario,
          nombre: nuevoUsuario.nombre,
          correo: nuevoUsuario.correo,
          fecha_creacion: nuevoUsuario.fecha_creacion
        }
      });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          status: 'error',
          message: 'El correo electrónico ya está registrado.'
        });
      }
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join(', ')
        });
      }
      console.error('Error al registrar usuario:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al procesar el registro.'
      });
    }
  },

  async login(req, res) {
    try {
      const disallowed = checkDisallowedFields(req.body, ALLOWED_LOGIN_FIELDS);
      if (disallowed) {
        return res.status(400).json({
          status: 'error',
          message: disallowed
        });
      }

      const { correo, password } = req.body;

      if (!correo || typeof correo !== 'string' || correo.trim() === '' ||
          !password || typeof password !== 'string' || password === '') {
        return res.status(400).json({
          status: 'error',
          message: 'Debe proporcionar correo y contraseña.'
        });
      }

      const normalizedEmail = correo.trim().toLowerCase();

      // Consultar usuario incluyendo hash con scope explícito
      const usuario = await Usuario.scope('withPassword').findOne({
        where: { correo: normalizedEmail }
      });

      // Si no existe, responder 401 genérico (previene enumeración de usuarios)
      if (!usuario) {
        return res.status(401).json({
          status: 'error',
          message: 'Credenciales inválidas.'
        });
      }

      // Comparación criptográfica
      const isPasswordValid = await bcrypt.compare(password, usuario.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          status: 'error',
          message: 'Credenciales inválidas.'
        });
      }

      // Emisión de token JWT
      const secret = getJwtSecret();
      const expiresIn = getJwtExpiresIn();
      const token = jwt.sign(
        { id_usuario: usuario.id_usuario },
        secret,
        { algorithm: 'HS256', expiresIn }
      );

      return res.status(200).json({
        status: 'success',
        token,
        usuario: {
          id_usuario: usuario.id_usuario,
          nombre: usuario.nombre,
          correo: usuario.correo
        }
      });
    } catch (err) {
      console.error('Error en login de usuario:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al procesar el inicio de sesión.'
      });
    }
  },

  async getMe(req, res) {
    try {
      // req.usuario fue adjuntado por authMiddleware (ya tiene password_hash excluido)
      return res.status(200).json({
        status: 'success',
        usuario: {
          id_usuario: req.usuario.id_usuario,
          nombre: req.usuario.nombre,
          correo: req.usuario.correo,
          fecha_creacion: req.usuario.fecha_creacion
        }
      });
    } catch (err) {
      console.error('Error al consultar perfil autenticado:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al consultar el perfil.'
      });
    }
  }
};

module.exports = authController;

