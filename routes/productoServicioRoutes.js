'use strict';

const express = require('express');
const router = express.Router();
const productoServicioController = require('../controllers/productoServicioController');

router.post('/', productoServicioController.crearProductoServicio);
router.get('/', productoServicioController.listarProductosServicios);
router.get('/:id', productoServicioController.obtenerProductoServicio);
router.put('/:id', productoServicioController.actualizarProductoServicio);
router.delete('/:id', productoServicioController.eliminarProductoServicio);

module.exports = router;

