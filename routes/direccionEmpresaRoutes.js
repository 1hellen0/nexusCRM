'use strict';

const express = require('express');
const router = express.Router();
const direccionEmpresaController = require('../controllers/direccionEmpresaController');

router.post('/', direccionEmpresaController.crearDireccion);
router.get('/', direccionEmpresaController.listarDirecciones);
router.get('/:id', direccionEmpresaController.obtenerDireccion);
router.put('/:id', direccionEmpresaController.actualizarDireccion);
router.delete('/:id', direccionEmpresaController.eliminarDireccion);

module.exports = router;

