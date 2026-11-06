'use strict';

const express = require('express');
const router = express.Router();
const departamentoController = require('../controllers/departamentoController');

router.post('/', departamentoController.crearDepartamento);
router.get('/', departamentoController.listarDepartamentos);
router.get('/:id', departamentoController.obtenerDepartamento);
router.put('/:id', departamentoController.actualizarDepartamento);
router.delete('/:id', departamentoController.eliminarDepartamento);

module.exports = router;

