'use strict';

const express = require('express');
const router = express.Router();
const contratoController = require('../controllers/contratoController');

router.post('/', contratoController.crearContrato);
router.get('/', contratoController.listarContratos);
router.get('/:id', contratoController.obtenerContrato);
router.put('/:id', contratoController.actualizarContrato);
router.delete('/:id', contratoController.eliminarContrato);

module.exports = router;

