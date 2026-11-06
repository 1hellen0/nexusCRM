'use strict';

const express = require('express');
const router = express.Router();
const categoriaProductoController = require('../controllers/categoriaProductoController');

router.post('/', categoriaProductoController.crearCategoria);
router.get('/', categoriaProductoController.listarCategorias);
router.get('/:id', categoriaProductoController.obtenerCategoria);
router.put('/:id', categoriaProductoController.actualizarCategoria);
router.delete('/:id', categoriaProductoController.eliminarCategoria);

module.exports = router;

