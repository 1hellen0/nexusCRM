'use strict';

const express = require('express');
const router = express.Router();
const pagoController = require('../controllers/pagoController');

router.get('/', pagoController.listarPagos);
router.get('/:id', pagoController.obtenerPago);
router.post('/', pagoController.crearPago);
router.put('/:id', pagoController.actualizarPago);
router.delete('/:id', pagoController.eliminarPago);

module.exports = router;

