'use strict';

const { Departamento, Empleado, Sequelize } = require('../models');

const ALLOWED_FIELDS = ['codigo', 'nombre', 'activo'];
const PROTECTED_FIELDS = ['id_departamento'];

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

function validateDepartamentoPayload(data, isUpdate = false) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'El cuerpo de la solicitud debe ser un objeto JSON válido.';
  }

  const disallowed = checkDisallowedFields(data);
  if (disallowed) return disallowed;

  if (!isUpdate) {
    if (!data.codigo || typeof data.codigo !== 'string' || data.codigo.trim() === '') {
      return 'El campo código es obligatorio.';
    }
    if (!data.nombre || typeof data.nombre !== 'string' || data.nombre.trim() === '') {
      return 'El campo nombre es obligatorio.';
    }
  }

  if (data.codigo !== undefined) {
    if (typeof data.codigo !== 'string' || data.codigo.trim() === '') {
      return 'El código no puede estar vacío.';
    }
    if (data.codigo.trim().length > 20) {
      return 'El código no puede superar los 20 caracteres.';
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

  if (data.activo !== undefined && typeof data.activo !== 'boolean') {
    return 'El campo activo debe ser un valor booleano (true o false).';
  }

  return null;
}

const departamentoController = {
  async listarDepartamentos(req, res) {
    try {
      const where = {};
      if (req.query.activo !== undefined) {
        where.activo = req.query.activo === 'true' || req.query.activo === '1';
      }

      const departamentos = await Departamento.findAll({
        where,
        order: [['id_departamento', 'ASC']]
      });

      return res.status(200).json({
        status: 'success',
        total: departamentos.length,
        data: departamentos
      });
    } catch (err) {
      console.error('Error al listar departamentos:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al consultar departamentos.'
      });
    }
  },

  async obtenerDepartamento(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El identificador debe ser un número entero positivo.'
        });
      }

      const departamento = await Departamento.findByPk(id, {
        include: [
          {
            model: Empleado,
            as: 'empleados',
            attributes: ['id_empleado', 'nombre', 'apellido', 'correo', 'cargo', 'activo']
          }
        ]
      });

      if (!departamento) {
        return res.status(404).json({
          status: 'error',
          message: `Departamento con ID ${id} no encontrado.`
        });
      }

      return res.status(200).json({
        status: 'success',
        data: departamento
      });
    } catch (err) {
      console.error('Error al obtener departamento:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al consultar el departamento.'
      });
    }
  },

  async crearDepartamento(req, res) {
    try {
      const validationError = validateDepartamentoPayload(req.body, false);
      if (validationError) {
        return res.status(400).json({
          status: 'error',
          message: validationError
        });
      }

      const codigoTrimmed = req.body.codigo.trim();
      const nombreTrimmed = req.body.nombre.trim();

      // Verificar unicidad de código
      const existingCodigo = await Departamento.findOne({
        where: { codigo: codigoTrimmed }
      });
      if (existingCodigo) {
        return res.status(409).json({
          status: 'error',
          message: `Ya existe un departamento con el código '${codigoTrimmed}'.`
        });
      }

      // Verificar unicidad de nombre
      const existingNombre = await Departamento.findOne({
        where: { nombre: nombreTrimmed }
      });
      if (existingNombre) {
        return res.status(409).json({
          status: 'error',
          message: `Ya existe un departamento con el nombre '${nombreTrimmed}'.`
        });
      }

      const payload = {
        codigo: codigoTrimmed,
        nombre: nombreTrimmed,
        activo: req.body.activo !== undefined ? req.body.activo : true
      };

      const nuevoDepartamento = await Departamento.create(payload);

      return res.status(201).json({
        status: 'success',
        data: nuevoDepartamento
      });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          status: 'error',
          message: 'El código o nombre del departamento ya está registrado.'
        });
      }
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join(', ')
        });
      }
      console.error('Error al crear departamento:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al crear el departamento.'
      });
    }
  },

  async actualizarDepartamento(req, res) {
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

      const validationError = validateDepartamentoPayload(req.body, true);
      if (validationError) {
        return res.status(400).json({
          status: 'error',
          message: validationError
        });
      }

      const departamento = await Departamento.findByPk(id);
      if (!departamento) {
        return res.status(404).json({
          status: 'error',
          message: `Departamento con ID ${id} no encontrado.`
        });
      }

      // Validar colisión de código
      if (req.body.codigo !== undefined) {
        const codigoTrimmed = req.body.codigo.trim();
        const existing = await Departamento.findOne({
          where: {
            codigo: codigoTrimmed,
            id_departamento: { [Sequelize.Op.ne]: id }
          }
        });
        if (existing) {
          return res.status(409).json({
            status: 'error',
            message: `Ya existe otro departamento con el código '${codigoTrimmed}'.`
          });
        }
      }

      // Validar colisión de nombre
      if (req.body.nombre !== undefined) {
        const nombreTrimmed = req.body.nombre.trim();
        const existing = await Departamento.findOne({
          where: {
            nombre: nombreTrimmed,
            id_departamento: { [Sequelize.Op.ne]: id }
          }
        });
        if (existing) {
          return res.status(409).json({
            status: 'error',
            message: `Ya existe otro departamento con el nombre '${nombreTrimmed}'.`
          });
        }
      }

      const updateData = {};
      if (req.body.codigo !== undefined) updateData.codigo = req.body.codigo.trim();
      if (req.body.nombre !== undefined) updateData.nombre = req.body.nombre.trim();
      if (req.body.activo !== undefined) updateData.activo = req.body.activo;

      await departamento.update(updateData);

      return res.status(200).json({
        status: 'success',
        data: departamento
      });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          status: 'error',
          message: 'El código o nombre del departamento ya está registrado.'
        });
      }
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join(', ')
        });
      }
      console.error('Error al actualizar departamento:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al actualizar el departamento.'
      });
    }
  },

  async eliminarDepartamento(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El identificador debe ser un número entero positivo.'
        });
      }

      const departamento = await Departamento.findByPk(id);
      if (!departamento) {
        return res.status(404).json({
          status: 'error',
          message: `Departamento con ID ${id} no encontrado.`
        });
      }

      // Verificar dependencia previa con Empleado (ON DELETE RESTRICT)
      const countEmpleados = await Empleado.count({
        where: { id_departamento: id }
      });

      if (countEmpleados > 0) {
        return res.status(409).json({
          status: 'error',
          message: 'No se puede eliminar el departamento porque tiene empleados asociados.'
        });
      }

      await departamento.destroy();

      return res.status(200).json({
        status: 'success',
        message: 'Departamento eliminado exitosamente.'
      });
    } catch (err) {
      // Capturar restricción de clave foránea a nivel de base de datos como fallback
      if (
        err.name === 'SequelizeForeignKeyConstraintError' ||
        (err.original && (err.original.code === 'ER_ROW_IS_REFERENCED_2' || err.original.errno === 1451))
      ) {
        return res.status(409).json({
          status: 'error',
          message: 'No se puede eliminar el departamento porque tiene empleados asociados.'
        });
      }

      console.error('Error al eliminar departamento:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al eliminar el departamento.'
      });
    }
  }
};

module.exports = departamentoController;

