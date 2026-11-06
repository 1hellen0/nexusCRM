'use strict';

const express = require('express');
const router = express.Router();
const detalleFacturaController = require('../controllers/detalleFacturaController');

router.post('/', detalleFacturaController.crearDetalle);
router.get('/', detalleFacturaController.listarDetalles);
router.get('/:id', detalleFacturaController.obtenerDetalle);
router.put('/:id', detalleFacturaController.actualizarDetalle);
router.delete('/:id', detalleFacturaController.eliminarDetalle);

module.exports = router;

