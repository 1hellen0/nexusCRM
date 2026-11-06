'use strict';

const express = require('express');
const router = express.Router();
const oportunidadComercialController = require('../controllers/oportunidadComercialController');

router.post('/', oportunidadComercialController.crearOportunidad);
router.get('/', oportunidadComercialController.listarOportunidades);
router.get('/:id', oportunidadComercialController.obtenerOportunidad);
router.put('/:id', oportunidadComercialController.actualizarOportunidad);
router.delete('/:id', oportunidadComercialController.eliminarOportunidad);

module.exports = router;

