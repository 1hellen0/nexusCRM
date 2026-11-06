'use strict';

const { EmpresaCliente, SectorEmpresarial } = require('../models');

const ALLOWED_FIELDS = ['nombre', 'sector', 'id_sector', 'correo', 'telefono', 'estado'];
const PROTECTED_FIELDS = ['id_empresa', 'fecha_registro'];
const VALID_ESTADOS = ['Prospecto', 'Activo', 'Inactivo'];
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

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

function validateEmpresaPayload(data, isUpdate = false) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'El cuerpo de la solicitud debe ser un objeto JSON válido.';
  }

  const disallowed = checkDisallowedFields(data);
  if (disallowed) return disallowed;

  if (!isUpdate) {
    if (!data.nombre || typeof data.nombre !== 'string' || data.nombre.trim() === '') {
      return 'El campo nombre es obligatorio.';
    }
    if (!data.sector || typeof data.sector !== 'string' || data.sector.trim() === '') {
      return 'El campo sector es obligatorio.';
    }
  }

  if (data.nombre !== undefined) {
    if (typeof data.nombre !== 'string' || data.nombre.trim() === '') {
      return 'El nombre no puede estar vacío.';
    }
    if (data.nombre.length > 150) {
      return 'El nombre no puede superar los 150 caracteres.';
    }
  }

  if (data.sector !== undefined) {
    if (typeof data.sector !== 'string' || data.sector.trim() === '') {
      return 'El sector no puede estar vacío.';
    }
    if (data.sector.length > 100) {
      return 'El sector no puede superar los 100 caracteres.';
    }
  }

  if (data.id_sector !== undefined && data.id_sector !== null && data.id_sector !== '') {
    const idSectorNum = validateId(data.id_sector);
    if (!idSectorNum) {
      return 'El campo id_sector debe ser un número entero positivo.';
    }
  }

  if (data.correo !== undefined && data.correo !== null && data.correo !== '') {
    if (typeof data.correo !== 'string' || !EMAIL_REGEX.test(data.correo.trim())) {
      return 'El formato del correo electrónico es inválido.';
    }
    if (data.correo.length > 150) {
      return 'El correo electrónico no puede superar los 150 caracteres.';
    }
  }

  if (data.telefono !== undefined && data.telefono !== null) {
    if (typeof data.telefono !== 'string') {
      return 'El teléfono debe ser una cadena de texto.';
    }
    if (data.telefono.length > 20) {
      return 'El teléfono no puede superar los 20 caracteres.';
    }
  }

  if (data.estado !== undefined) {
    if (!VALID_ESTADOS.includes(data.estado)) {
      return `El estado es inválido. Valores permitidos: ${VALID_ESTADOS.join(', ')}.`;
    }
  }

  return null;
}

const empresaClienteController = {
  async crearEmpresa(req, res) {
    try {
      const validationError = validateEmpresaPayload(req.body, false);
      if (validationError) {
        return res.status(400).json({
          status: 'error',
          message: validationError
        });
      }

      let idSector = null;
      if (req.body.id_sector !== undefined && req.body.id_sector !== null && req.body.id_sector !== '') {
        idSector = validateId(req.body.id_sector);
        const sectorObj = await SectorEmpresarial.findByPk(idSector);
        if (!sectorObj) {
          return res.status(404).json({
            status: 'error',
            message: `El sector empresarial con ID ${idSector} no existe.`
          });
        }
      }

      const payload = {
        nombre: req.body.nombre.trim(),
        sector: req.body.sector.trim(),
        id_sector: idSector,
        correo: req.body.correo ? req.body.correo.trim() : null,
        telefono: req.body.telefono ? req.body.telefono.trim() : null,
        estado: req.body.estado || 'Prospecto'
      };

      const nuevaEmpresa = await EmpresaCliente.create(payload);

      return res.status(201).json({
        status: 'success',
        data: nuevaEmpresa
      });
    } catch (err) {
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join(', ')
        });
      }
      console.error('Error al crear EmpresaCliente:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al crear la empresa.'
      });
    }
  },

  async listarEmpresas(req, res) {
    try {
      const empresas = await EmpresaCliente.findAll({
        order: [['id_empresa', 'ASC']],
        include: [
          {
            model: SectorEmpresarial,
            as: 'sectorEmpresarial',
            attributes: ['id_sector', 'nombre']
          }
        ]
      });

      return res.status(200).json({
        status: 'success',
        total: empresas.length,
        data: empresas
      });
    } catch (err) {
      console.error('Error al listar empresas:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al consultar empresas.'
      });
    }
  },

  async obtenerEmpresa(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El identificador debe ser un número entero positivo.'
        });
      }

      const empresa = await EmpresaCliente.findByPk(id, {
        include: [
          {
            model: SectorEmpresarial,
            as: 'sectorEmpresarial',
            attributes: ['id_sector', 'nombre']
          }
        ]
      });
      if (!empresa) {
        return res.status(404).json({
          status: 'error',
          message: `Empresa con ID ${id} no encontrada.`
        });
      }

      return res.status(200).json({
        status: 'success',
        data: empresa
      });
    } catch (err) {
      console.error('Error al obtener empresa:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al obtener la empresa.'
      });
    }
  },

  async actualizarEmpresa(req, res) {
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

      const validationError = validateEmpresaPayload(req.body, true);
      if (validationError) {
        return res.status(400).json({
          status: 'error',
          message: validationError
        });
      }

      const empresa = await EmpresaCliente.findByPk(id, {
        include: [
          {
            model: SectorEmpresarial,
            as: 'sectorEmpresarial',
            attributes: ['id_sector', 'nombre']
          }
        ]
      });
      if (!empresa) {
        return res.status(404).json({
          status: 'error',
          message: `Empresa con ID ${id} no encontrada.`
        });
      }

      const updateData = {};
      if (req.body.nombre !== undefined) updateData.nombre = req.body.nombre.trim();
      if (req.body.sector !== undefined) updateData.sector = req.body.sector.trim();
      if (req.body.correo !== undefined) updateData.correo = req.body.correo ? req.body.correo.trim() : null;
      if (req.body.telefono !== undefined) updateData.telefono = req.body.telefono ? req.body.telefono.trim() : null;
      if (req.body.estado !== undefined) updateData.estado = req.body.estado;
      if (req.body.id_sector !== undefined) {
        if (req.body.id_sector === null || req.body.id_sector === '') {
          updateData.id_sector = null;
        } else {
          const idSector = validateId(req.body.id_sector);
          const sectorObj = await SectorEmpresarial.findByPk(idSector);
          if (!sectorObj) {
            return res.status(404).json({
              status: 'error',
              message: `El sector empresarial con ID ${idSector} no existe.`
            });
          }
          updateData.id_sector = idSector;
        }
      }

      await empresa.update(updateData);

      return res.status(200).json({
        status: 'success',
        data: empresa
      });
    } catch (err) {
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join(', ')
        });
      }
      console.error('Error al actualizar empresa:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al actualizar la empresa.'
      });
    }
  },

  async eliminarEmpresa(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El identificador debe ser un número entero positivo.'
        });
      }

      const empresa = await EmpresaCliente.findByPk(id, {
        include: [
          {
            model: SectorEmpresarial,
            as: 'sectorEmpresarial',
            attributes: ['id_sector', 'nombre']
          }
        ]
      });
      if (!empresa) {
        return res.status(404).json({
          status: 'error',
          message: `Empresa con ID ${id} no encontrada.`
        });
      }

      await empresa.destroy();

      return res.status(200).json({
        status: 'success',
        message: 'Empresa eliminada exitosamente.'
      });
    } catch (err) {
      // Captura de restricción de clave foránea en MySQL (ON DELETE RESTRICT)
      if (
        err.name === 'SequelizeForeignKeyConstraintError' ||
        (err.original && (err.original.code === 'ER_ROW_IS_REFERENCED_2' || err.original.errno === 1451))
      ) {
        return res.status(409).json({
          status: 'error',
          message: 'No se puede eliminar la empresa porque tiene registros asociados (contactos u oportunidades).'
        });
      }

      console.error('Error al eliminar empresa:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al eliminar la empresa.'
      });
    }
  }
};

module.exports = empresaClienteController;

