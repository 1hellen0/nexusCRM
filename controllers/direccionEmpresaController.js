'use strict';

const { DireccionEmpresa, EmpresaCliente } = require('../models');

const ALLOWED_FIELDS = [
  'id_empresa',
  'tipo',
  'calle',
  'ciudad',
  'estado_provincia',
  'codigo_postal',
  'pais'
];
const PROTECTED_FIELDS = ['id_direccion'];
const VALID_TIPOS = ['Fiscal', 'Operativa', 'Entrega', 'Matriz'];

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

function validateDireccionPayload(data, isUpdate = false) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'El cuerpo de la solicitud debe ser un objeto JSON válido.';
  }

  const disallowed = checkDisallowedFields(data);
  if (disallowed) return disallowed;

  if (!isUpdate) {
    if (data.id_empresa === undefined || data.id_empresa === null) {
      return 'El campo id_empresa es obligatorio.';
    }
    if (!data.calle || typeof data.calle !== 'string' || data.calle.trim() === '') {
      return 'El campo calle es obligatorio.';
    }
    if (!data.ciudad || typeof data.ciudad !== 'string' || data.ciudad.trim() === '') {
      return 'El campo ciudad es obligatorio.';
    }
    if (!data.estado_provincia || typeof data.estado_provincia !== 'string' || data.estado_provincia.trim() === '') {
      return 'El campo estado_provincia es obligatorio.';
    }
    if (!data.pais || typeof data.pais !== 'string' || data.pais.trim() === '') {
      return 'El campo país es obligatorio.';
    }
  }

  if (data.id_empresa !== undefined) {
    const idEmpresaNum = validateId(data.id_empresa);
    if (!idEmpresaNum) {
      return 'El campo id_empresa debe ser un número entero positivo.';
    }
  }

  if (data.tipo !== undefined) {
    if (!VALID_TIPOS.includes(data.tipo)) {
      return `El tipo es inválido. Valores permitidos: ${VALID_TIPOS.join(', ')}.`;
    }
  }

  if (data.calle !== undefined) {
    if (typeof data.calle !== 'string' || data.calle.trim() === '') {
      return 'La calle no puede estar vacía.';
    }
    if (data.calle.trim().length > 200) {
      return 'La calle no puede superar los 200 caracteres.';
    }
  }

  if (data.ciudad !== undefined) {
    if (typeof data.ciudad !== 'string' || data.ciudad.trim() === '') {
      return 'La ciudad no puede estar vacía.';
    }
    if (data.ciudad.trim().length > 100) {
      return 'La ciudad no puede superar los 100 caracteres.';
    }
  }

  if (data.estado_provincia !== undefined) {
    if (typeof data.estado_provincia !== 'string' || data.estado_provincia.trim() === '') {
      return 'El estado o provincia no puede estar vacío.';
    }
    if (data.estado_provincia.trim().length > 100) {
      return 'El estado o provincia no puede superar los 100 caracteres.';
    }
  }

  if (data.codigo_postal !== undefined && data.codigo_postal !== null && data.codigo_postal !== '') {
    if (typeof data.codigo_postal !== 'string') {
      return 'El código postal debe ser una cadena de texto.';
    }
    if (data.codigo_postal.length > 20) {
      return 'El código postal no puede superar los 20 caracteres.';
    }
  }

  if (data.pais !== undefined) {
    if (typeof data.pais !== 'string' || data.pais.trim() === '') {
      return 'El país no puede estar vacío.';
    }
    if (data.pais.trim().length > 80) {
      return 'El país no puede superar los 80 caracteres.';
    }
  }

  return null;
}

const direccionEmpresaController = {
  async listarDirecciones(req, res) {
    try {
      const where = {};
      if (req.query.id_empresa !== undefined) {
        const idEmp = validateId(req.query.id_empresa);
        if (idEmp) where.id_empresa = idEmp;
      }
      if (req.query.tipo !== undefined && VALID_TIPOS.includes(req.query.tipo)) {
        where.tipo = req.query.tipo;
      }

      const direcciones = await DireccionEmpresa.findAll({
        where,
        order: [['id_direccion', 'ASC']],
        include: [
          {
            model: EmpresaCliente,
            as: 'empresa',
            attributes: ['id_empresa', 'nombre', 'sector', 'estado']
          }
        ]
      });

      return res.status(200).json({
        status: 'success',
        total: direcciones.length,
        data: direcciones
      });
    } catch (err) {
      console.error('Error al listar direcciones de empresa:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al consultar direcciones de empresa.'
      });
    }
  },

  async obtenerDireccion(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El identificador debe ser un número entero positivo.'
        });
      }

      const direccion = await DireccionEmpresa.findByPk(id, {
        include: [
          {
            model: EmpresaCliente,
            as: 'empresa',
            attributes: ['id_empresa', 'nombre', 'sector', 'correo', 'telefono', 'estado']
          }
        ]
      });

      if (!direccion) {
        return res.status(404).json({
          status: 'error',
          message: `Dirección con ID ${id} no encontrada.`
        });
      }

      return res.status(200).json({
        status: 'success',
        data: direccion
      });
    } catch (err) {
      console.error('Error al obtener dirección de empresa:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al consultar la dirección de empresa.'
      });
    }
  },

  async crearDireccion(req, res) {
    try {
      const validationError = validateDireccionPayload(req.body, false);
      if (validationError) {
        return res.status(400).json({
          status: 'error',
          message: validationError
        });
      }

      const idEmpresa = validateId(req.body.id_empresa);

      // Verificar existencia de EmpresaCliente
      const empresa = await EmpresaCliente.findByPk(idEmpresa);
      if (!empresa) {
        return res.status(404).json({
          status: 'error',
          message: `La empresa con ID ${idEmpresa} no existe.`
        });
      }

      const payload = {
        id_empresa: idEmpresa,
        tipo: req.body.tipo || 'Fiscal',
        calle: req.body.calle.trim(),
        ciudad: req.body.ciudad.trim(),
        estado_provincia: req.body.estado_provincia.trim(),
        codigo_postal: req.body.codigo_postal ? req.body.codigo_postal.trim() : null,
        pais: req.body.pais.trim()
      };

      const nuevaDireccion = await DireccionEmpresa.create(payload);

      return res.status(201).json({
        status: 'success',
        data: nuevaDireccion
      });
    } catch (err) {
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join(', ')
        });
      }
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
          status: 'error',
          message: 'Error de integridad referencial: la empresa especificada no es válida.'
        });
      }
      console.error('Error al crear dirección de empresa:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al crear la dirección de empresa.'
      });
    }
  },

  async actualizarDireccion(req, res) {
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

      const validationError = validateDireccionPayload(req.body, true);
      if (validationError) {
        return res.status(400).json({
          status: 'error',
          message: validationError
        });
      }

      const direccion = await DireccionEmpresa.findByPk(id);
      if (!direccion) {
        return res.status(404).json({
          status: 'error',
          message: `Dirección con ID ${id} no encontrada.`
        });
      }

      // Si se actualiza id_empresa, verificar existencia
      if (req.body.id_empresa !== undefined) {
        const idEmpresa = validateId(req.body.id_empresa);
        const empresa = await EmpresaCliente.findByPk(idEmpresa);
        if (!empresa) {
          return res.status(404).json({
            status: 'error',
            message: `La empresa con ID ${idEmpresa} no existe.`
          });
        }
      }

      const updateData = {};
      if (req.body.id_empresa !== undefined) updateData.id_empresa = validateId(req.body.id_empresa);
      if (req.body.tipo !== undefined) updateData.tipo = req.body.tipo;
      if (req.body.calle !== undefined) updateData.calle = req.body.calle.trim();
      if (req.body.ciudad !== undefined) updateData.ciudad = req.body.ciudad.trim();
      if (req.body.estado_provincia !== undefined) updateData.estado_provincia = req.body.estado_provincia.trim();
      if (req.body.codigo_postal !== undefined) {
        updateData.codigo_postal = req.body.codigo_postal ? req.body.codigo_postal.trim() : null;
      }
      if (req.body.pais !== undefined) updateData.pais = req.body.pais.trim();

      await direccion.update(updateData);

      const direccionActualizada = await DireccionEmpresa.findByPk(id, {
        include: [
          {
            model: EmpresaCliente,
            as: 'empresa',
            attributes: ['id_empresa', 'nombre', 'sector', 'estado']
          }
        ]
      });

      return res.status(200).json({
        status: 'success',
        data: direccionActualizada
      });
    } catch (err) {
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join(', ')
        });
      }
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
          status: 'error',
          message: 'Error de integridad referencial: la empresa especificada no es válida.'
        });
      }
      console.error('Error al actualizar dirección de empresa:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al actualizar la dirección de empresa.'
      });
    }
  },

  async eliminarDireccion(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El identificador debe ser un número entero positivo.'
        });
      }

      const direccion = await DireccionEmpresa.findByPk(id);
      if (!direccion) {
        return res.status(404).json({
          status: 'error',
          message: `Dirección con ID ${id} no encontrada.`
        });
      }

      await direccion.destroy();

      return res.status(200).json({
        status: 'success',
        message: 'Dirección eliminada exitosamente.'
      });
    } catch (err) {
      console.error('Error al eliminar dirección de empresa:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al eliminar la dirección de empresa.'
      });
    }
  }
};

module.exports = direccionEmpresaController;

