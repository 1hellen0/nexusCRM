'use strict';

const express = require('express');
const router = express.Router();
const actividadSeguimientoController = require('../controllers/actividadSeguimientoController');

router.post('/', actividadSeguimientoController.crearActividad);
router.get('/', actividadSeguimientoController.listarActividades);
router.get('/:id', actividadSeguimientoController.obtenerActividad);
router.put('/:id', actividadSeguimientoController.actualizarActividad);
router.delete('/:id', actividadSeguimientoController.eliminarActividad);

module.exports = router;

