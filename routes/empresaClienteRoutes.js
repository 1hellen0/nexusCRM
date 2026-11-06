'use strict';

const express = require('express');
const router = express.Router();
const empresaClienteController = require('../controllers/empresaClienteController');

router.post('/', empresaClienteController.crearEmpresa);
router.get('/', empresaClienteController.listarEmpresas);
router.get('/:id', empresaClienteController.obtenerEmpresa);
router.put('/:id', empresaClienteController.actualizarEmpresa);
router.delete('/:id', empresaClienteController.eliminarEmpresa);

module.exports = router;

