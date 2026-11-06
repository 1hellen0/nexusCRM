'use strict';

const express = require('express');
const router = express.Router();
const cotizacionController = require('../controllers/cotizacionController');

router.post('/', cotizacionController.crearCotizacion);
router.get('/', cotizacionController.listarCotizaciones);
router.get('/:id', cotizacionController.obtenerCotizacion);
router.put('/:id', cotizacionController.actualizarCotizacion);
router.delete('/:id', cotizacionController.eliminarCotizacion);

module.exports = router;

