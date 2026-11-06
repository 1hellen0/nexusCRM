'use strict';

const { SectorEmpresarial, EmpresaCliente, Sequelize } = require('../models');

const ALLOWED_FIELDS = ['nombre', 'descripcion', 'activo'];
const PROTECTED_FIELDS = ['id_sector'];

function validateId(param) {
  if (typeof param !== 'string' && typeof param !== 'number') return null;
  const str = String(param).trim();
  if (!/^[1-9]\d*$/.test(str)) return null;
  const num = parseInt(str, 10);
  return Number.isSafeInteger(num) ? num : null;
}

function checkDisallowedFields(body) {
  const keys = Object.keys(body);
  for (const key of keys) {
    if (PROTECTED_FIELDS.includes(key)) {
      return `No se permite modificar o enviar el atributo protegido '${key}'.`;
    }
    if (!ALLOWED_FIELDS.includes(key)) {
      return `El campo '${key}' no está permitido.`;
    }
  }
  return null;
}

function validateSectorPayload(data, isUpdate = false) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'El cuerpo de la solicitud debe ser un objeto JSON válido.';
  }

  const disallowed = checkDisallowedFields(data);
  if (disallowed) return disallowed;

  if (!isUpdate) {
    if (!data.nombre || typeof data.nombre !== 'string' || data.nombre.trim() === '') {
      return 'El campo nombre es obligatorio.';
    }
  }

  if (data.nombre !== undefined) {
    if (typeof data.nombre !== 'string' || data.nombre.trim() === '') {
      return 'El nombre no puede estar vacío.';
    }
    if (data.nombre.trim().length > 80) {
      return 'El nombre no puede superar los 80 caracteres.';
    }
  }

  if (data.descripcion !== undefined && data.descripcion !== null && data.descripcion !== '') {
    if (typeof data.descripcion !== 'string') {
      return 'La descripción debe ser una cadena de texto.';
    }
    if (data.descripcion.length > 255) {
      return 'La descripción no puede superar los 255 caracteres.';
    }
  }

  if (data.activo !== undefined && typeof data.activo !== 'boolean') {
    return 'El campo activo debe ser un valor booleano (true o false).';
  }

  return null;
}

const sectorEmpresarialController = {
  async listarSectores(req, res) {
    try {
      const where = {};
      if (req.query.activo !== undefined) {
        where.activo = req.query.activo === 'true' || req.query.activo === '1';
      }

      const sectores = await SectorEmpresarial.findAll({
        where,
        order: [['id_sector', 'ASC']]
      });

      return res.status(200).json({
        status: 'success',
        total: sectores.length,
        data: sectores
      });
    } catch (err) {
      console.error('Error al listar sectores empresariales:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al consultar sectores empresariales.'
      });
    }
  },

  async obtenerSector(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El identificador debe ser un número entero positivo.'
        });
      }

      const sector = await SectorEmpresarial.findByPk(id, {
        include: [
          {
            model: EmpresaCliente,
            as: 'empresas',
            attributes: ['id_empresa', 'nombre', 'sector', 'estado']
          }
        ]
      });

      if (!sector) {
        return res.status(404).json({
          status: 'error',
          message: `Sector empresarial con ID ${id} no encontrado.`
        });
      }

      return res.status(200).json({
        status: 'success',
        data: sector
      });
    } catch (err) {
      console.error('Error al obtener sector empresarial:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al consultar el sector empresarial.'
      });
    }
  },

  async crearSector(req, res) {
    try {
      const validationError = validateSectorPayload(req.body, false);
      if (validationError) {
        return res.status(400).json({
          status: 'error',
          message: validationError
        });
      }

      const nombreTrimmed = req.body.nombre.trim();

      // Verificar unicidad previa
      const existing = await SectorEmpresarial.findOne({
        where: { nombre: nombreTrimmed }
      });

      if (existing) {
        return res.status(409).json({
          status: 'error',
          message: `Ya existe un sector empresarial con el nombre '${nombreTrimmed}'.`
        });
      }

      const payload = {
        nombre: nombreTrimmed,
        descripcion: req.body.descripcion ? req.body.descripcion.trim() : null,
        activo: req.body.activo !== undefined ? req.body.activo : true
      };

      const nuevoSector = await SectorEmpresarial.create(payload);

      return res.status(201).json({
        status: 'success',
        data: nuevoSector
      });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          status: 'error',
          message: 'El nombre del sector empresarial ya está registrado.'
        });
      }
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join(', ')
        });
      }
      console.error('Error al crear sector empresarial:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al crear el sector empresarial.'
      });
    }
  },

  async actualizarSector(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El identificador debe ser un número entero positivo.'
        });
      }

      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Debe proporcionar al menos un campo válido para actualizar.'
        });
      }

      const validationError = validateSectorPayload(req.body, true);
      if (validationError) {
        return res.status(400).json({
          status: 'error',
          message: validationError
        });
      }

      const sector = await SectorEmpresarial.findByPk(id);
      if (!sector) {
        return res.status(404).json({
          status: 'error',
          message: `Sector empresarial con ID ${id} no encontrado.`
        });
      }

      // Si cambia el nombre, verificar que no colisione con otro
      if (req.body.nombre !== undefined) {
        const nombreTrimmed = req.body.nombre.trim();
        const existing = await SectorEmpresarial.findOne({
          where: {
            nombre: nombreTrimmed,
            id_sector: { [Sequelize.Op.ne]: id }
          }
        });

        if (existing) {
          return res.status(409).json({
            status: 'error',
            message: `Ya existe otro sector empresarial con el nombre '${nombreTrimmed}'.`
          });
        }
      }

      const updateData = {};
      if (req.body.nombre !== undefined) updateData.nombre = req.body.nombre.trim();
      if (req.body.descripcion !== undefined) {
        updateData.descripcion = req.body.descripcion ? req.body.descripcion.trim() : null;
      }
      if (req.body.activo !== undefined) updateData.activo = req.body.activo;

      await sector.update(updateData);

      return res.status(200).json({
        status: 'success',
        data: sector
      });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          status: 'error',
          message: 'El nombre del sector empresarial ya está registrado.'
        });
      }
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join(', ')
        });
      }
      console.error('Error al actualizar sector empresarial:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al actualizar el sector empresarial.'
      });
    }
  },

  async eliminarSector(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El identificador debe ser un número entero positivo.'
        });
      }

      const sector = await SectorEmpresarial.findByPk(id);
      if (!sector) {
        return res.status(404).json({
          status: 'error',
          message: `Sector empresarial con ID ${id} no encontrado.`
        });
      }

      await sector.destroy();

      return res.status(200).json({
        status: 'success',
        message: 'Sector empresarial eliminado exitosamente.'
      });
    } catch (err) {
      console.error('Error al eliminar sector empresarial:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al eliminar el sector empresarial.'
      });
    }
  }
};

module.exports = sectorEmpresarialController;

