'use strict';

const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error('Configuración de seguridad inválida: JWT_SECRET ausente o no cumple con la longitud mínima requerida.');
  }
  return secret.trim();
}

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string') {
      return res.status(401).json({
        error: 'No autorizado'
      });
    }

    const parts = authHeader.trim().split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
      return res.status(401).json({
        error: 'No autorizado'
      });
    }

    const token = parts[1];
    let decoded;
    try {
      const secret = getJwtSecret();
      decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    } catch (jwtErr) {
      return res.status(401).json({
        error: 'No autorizado'
      });
    }

    if (!decoded || !decoded.id_usuario) {
      return res.status(401).json({
        error: 'No autorizado'
      });
    }

    // Comprobar existencia real del usuario en MySQL (defaultScope excluye password_hash)
    const usuario = await Usuario.findByPk(decoded.id_usuario);
    if (!usuario) {
      return res.status(401).json({
        error: 'No autorizado'
      });
    }

    req.usuario = usuario;
    next();
  } catch (err) {
    console.error('Error inesperado en authMiddleware:', err.message);
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
}

module.exports = authMiddleware;
