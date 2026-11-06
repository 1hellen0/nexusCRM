'use strict';

const express = require('express');
const router = express.Router();
const sectorEmpresarialController = require('../controllers/sectorEmpresarialController');

router.post('/', sectorEmpresarialController.crearSector);
router.get('/', sectorEmpresarialController.listarSectores);
router.get('/:id', sectorEmpresarialController.obtenerSector);
router.put('/:id', sectorEmpresarialController.actualizarSector);
router.delete('/:id', sectorEmpresarialController.eliminarSector);

module.exports = router;

