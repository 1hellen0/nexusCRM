'use strict';

const express = require('express');
const router = express.Router();
const campanaMarketingController = require('../controllers/campanaMarketingController');

router.post('/', campanaMarketingController.crearCampana);
router.get('/', campanaMarketingController.listarCampanas);
router.get('/:id', campanaMarketingController.obtenerCampana);
router.put('/:id', campanaMarketingController.actualizarCampana);
router.delete('/:id', campanaMarketingController.eliminarCampana);

module.exports = router;

