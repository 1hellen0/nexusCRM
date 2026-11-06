'use strict';

const express = require('express');
const router = express.Router();
const detalleCotizacionController = require('../controllers/detalleCotizacionController');

router.post('/', detalleCotizacionController.crearDetalle);
router.get('/', detalleCotizacionController.listarDetalles);
router.get('/:id', detalleCotizacionController.obtenerDetalle);
router.put('/:id', detalleCotizacionController.actualizarDetalle);
router.delete('/:id', detalleCotizacionController.eliminarDetalle);

module.exports = router;

