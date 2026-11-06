'use strict';

const express = require('express');
const router = express.Router();
const contactoController = require('../controllers/contactoController');

router.post('/', contactoController.crearContacto);
router.get('/', contactoController.listarContactos);
router.get('/:id', contactoController.obtenerContacto);
router.put('/:id', contactoController.actualizarContacto);
router.delete('/:id', contactoController.eliminarContacto);

module.exports = router;

