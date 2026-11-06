'use strict';

const express = require('express');
const router = express.Router();
const facturaController = require('../controllers/facturaController');

router.post('/', facturaController.crearFactura);
router.get('/', facturaController.listarFacturas);
router.get('/:id', facturaController.obtenerFactura);
router.put('/:id', facturaController.actualizarFactura);
router.delete('/:id', facturaController.eliminarFactura);

module.exports = router;

