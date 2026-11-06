'use strict';

const {
  Empleado,
  Departamento,
  Usuario,
  CampañaMarketing,
  Cotizacion,
  Contrato,
  Sequelize
} = require('../models');

const ALLOWED_FIELDS = [
  'id_departamento',
  'id_usuario',
  'nombre',
  'apellido',
  'correo',
  'telefono',
  'cargo',
  'activo'
];
const PROTECTED_FIELDS = ['id_empleado'];
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

function validateEmpleadoPayload(data, isUpdate = false) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'El cuerpo de la solicitud debe ser un objeto JSON válido.';
  }

  const disallowed = checkDisallowedFields(data);
  if (disallowed) return disallowed;

  if (!isUpdate) {
    if (data.id_departamento === undefined || data.id_departamento === null) {
      return 'El campo id_departamento es obligatorio.';
    }
    if (!data.nombre || typeof data.nombre !== 'string' || data.nombre.trim() === '') {
      return 'El campo nombre es obligatorio.';
    }
    if (!data.apellido || typeof data.apellido !== 'string' || data.apellido.trim() === '') {
      return 'El campo apellido es obligatorio.';
    }
    if (!data.correo || typeof data.correo !== 'string' || data.correo.trim() === '') {
      return 'El campo correo es obligatorio.';
    }
    if (!data.cargo || typeof data.cargo !== 'string' || data.cargo.trim() === '') {
      return 'El campo cargo es obligatorio.';
    }
  }

  if (data.id_departamento !== undefined) {
    const idDeptoNum = validateId(data.id_departamento);
    if (!idDeptoNum) {
      return 'El campo id_departamento debe ser un número entero positivo.';
    }
  }

  if (data.id_usuario !== undefined && data.id_usuario !== null && data.id_usuario !== '') {
    const idUserNum = validateId(data.id_usuario);
    if (!idUserNum) {
      return 'El campo id_usuario debe ser un número entero positivo.';
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

  if (data.apellido !== undefined) {
    if (typeof data.apellido !== 'string' || data.apellido.trim() === '') {
      return 'El apellido no puede estar vacío.';
    }
    if (data.apellido.trim().length > 80) {
      return 'El apellido no puede superar los 80 caracteres.';
    }
  }

  if (data.correo !== undefined) {
    if (typeof data.correo !== 'string' || !EMAIL_REGEX.test(data.correo.trim())) {
      return 'El formato del correo electrónico es inválido.';
    }
    if (data.correo.trim().length > 150) {
      return 'El correo no puede superar los 150 caracteres.';
    }
  }

  if (data.telefono !== undefined && data.telefono !== null && data.telefono !== '') {
    if (typeof data.telefono !== 'string') {
      return 'El teléfono debe ser una cadena de texto.';
    }
    if (data.telefono.trim().length > 20) {
      return 'El teléfono no puede superar los 20 caracteres.';
    }
  }

  if (data.cargo !== undefined) {
    if (typeof data.cargo !== 'string' || data.cargo.trim() === '') {
      return 'El cargo no puede estar vacío.';
    }
    if (data.cargo.trim().length > 100) {
      return 'El cargo no puede superar los 100 caracteres.';
    }
  }

  if (data.activo !== undefined && typeof data.activo !== 'boolean') {
    return 'El campo activo debe ser un valor booleano (true o false).';
  }

  return null;
}

const empleadoController = {
  async listarEmpleados(req, res) {
    try {
      const where = {};
      if (req.query.id_departamento !== undefined) {
        const idDepto = validateId(req.query.id_departamento);
        if (idDepto) where.id_departamento = idDepto;
      }
      if (req.query.activo !== undefined) {
        where.activo = req.query.activo === 'true' || req.query.activo === '1';
      }

      const empleados = await Empleado.findAll({
        where,
        order: [['id_empleado', 'ASC']],
        include: [
          {
            model: Departamento,
            as: 'departamento',
            attributes: ['id_departamento', 'codigo', 'nombre']
          },
          {
            model: Usuario,
            as: 'usuario',
            attributes: ['id_usuario', 'nombre', 'correo', 'fecha_creacion']
          }
        ]
      });

      return res.status(200).json({
        status: 'success',
        total: empleados.length,
        data: empleados
      });
    } catch (err) {
      console.error('Error al listar empleados:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al consultar empleados.'
      });
    }
  },

  async obtenerEmpleado(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El identificador debe ser un número entero positivo.'
        });
      }

      const empleado = await Empleado.findByPk(id, {
        include: [
          {
            model: Departamento,
            as: 'departamento',
            attributes: ['id_departamento', 'codigo', 'nombre', 'activo']
          },
          {
            model: Usuario,
            as: 'usuario',
            attributes: ['id_usuario', 'nombre', 'correo', 'fecha_creacion']
          }
        ]
      });

      if (!empleado) {
        return res.status(404).json({
          status: 'error',
          message: `Empleado con ID ${id} no encontrado.`
        });
      }

      return res.status(200).json({
        status: 'success',
        data: empleado
      });
    } catch (err) {
      console.error('Error al obtener empleado:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al consultar el empleado.'
      });
    }
  },

  async crearEmpleado(req, res) {
    try {
      const validationError = validateEmpleadoPayload(req.body, false);
      if (validationError) {
        return res.status(400).json({
          status: 'error',
          message: validationError
        });
      }

      const idDepto = validateId(req.body.id_departamento);

      // 1. Verificar existencia de Departamento
      const depto = await Departamento.findByPk(idDepto);
      if (!depto) {
        return res.status(404).json({
          status: 'error',
          message: `El departamento con ID ${idDepto} no existe.`
        });
      }

      // 2. Verificar existencia y unicidad de id_usuario si se proporciona
      let idUsuario = null;
      if (req.body.id_usuario !== undefined && req.body.id_usuario !== null && req.body.id_usuario !== '') {
        idUsuario = validateId(req.body.id_usuario);
        const user = await Usuario.findByPk(idUsuario);
        if (!user) {
          return res.status(404).json({
            status: 'error',
            message: `El usuario con ID ${idUsuario} no existe.`
          });
        }

        const existingEmpUser = await Empleado.findOne({
          where: { id_usuario: idUsuario }
        });
        if (existingEmpUser) {
          return res.status(409).json({
            status: 'error',
            message: 'El usuario ya está vinculado a otro empleado.'
          });
        }
      }

      // 3. Verificar unicidad de correo
      const correoTrimmed = req.body.correo.trim().toLowerCase();
      const existingCorreo = await Empleado.findOne({
        where: { correo: correoTrimmed }
      });
      if (existingCorreo) {
        return res.status(409).json({
          status: 'error',
          message: `El correo electrónico '${correoTrimmed}' ya está registrado.`
        });
      }

      const payload = {
        id_departamento: idDepto,
        id_usuario: idUsuario,
        nombre: req.body.nombre.trim(),
        apellido: req.body.apellido.trim(),
        correo: correoTrimmed,
        telefono: req.body.telefono ? req.body.telefono.trim() : null,
        cargo: req.body.cargo.trim(),
        activo: req.body.activo !== undefined ? req.body.activo : true
      };

      const nuevoEmpleado = await Empleado.create(payload);

      const empleadoCreado = await Empleado.findByPk(nuevoEmpleado.id_empleado, {
        include: [
          {
            model: Departamento,
            as: 'departamento',
            attributes: ['id_departamento', 'codigo', 'nombre']
          },
          {
            model: Usuario,
            as: 'usuario',
            attributes: ['id_usuario', 'nombre', 'correo', 'fecha_creacion']
          }
        ]
      });

      return res.status(201).json({
        status: 'success',
        data: empleadoCreado
      });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          status: 'error',
          message: 'El correo electrónico o usuario ya está registrado en otro empleado.'
        });
      }
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join(', ')
        });
      }
      console.error('Error al crear empleado:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al crear el empleado.'
      });
    }
  },

  async actualizarEmpleado(req, res) {
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

      const validationError = validateEmpleadoPayload(req.body, true);
      if (validationError) {
        return res.status(400).json({
          status: 'error',
          message: validationError
        });
      }

      const empleado = await Empleado.findByPk(id);
      if (!empleado) {
        return res.status(404).json({
          status: 'error',
          message: `Empleado con ID ${id} no encontrado.`
        });
      }

      // Si se actualiza id_departamento, verificar existencia
      if (req.body.id_departamento !== undefined) {
        const idDepto = validateId(req.body.id_departamento);
        const depto = await Departamento.findByPk(idDepto);
        if (!depto) {
          return res.status(404).json({
            status: 'error',
            message: `El departamento con ID ${idDepto} no existe.`
          });
        }
      }

      // Si se actualiza id_usuario
      let idUsuarioUpdate;
      if (req.body.id_usuario !== undefined) {
        if (req.body.id_usuario === null || req.body.id_usuario === '') {
          idUsuarioUpdate = null;
        } else {
          const idUser = validateId(req.body.id_usuario);
          const user = await Usuario.findByPk(idUser);
          if (!user) {
            return res.status(404).json({
              status: 'error',
              message: `El usuario con ID ${idUser} no existe.`
            });
          }

          const existingEmpUser = await Empleado.findOne({
            where: {
              id_usuario: idUser,
              id_empleado: { [Sequelize.Op.ne]: id }
            }
          });
          if (existingEmpUser) {
            return res.status(409).json({
              status: 'error',
              message: 'El usuario ya está vinculado a otro empleado.'
            });
          }
          idUsuarioUpdate = idUser;
        }
      }

      // Si se actualiza correo, verificar unicidad
      if (req.body.correo !== undefined) {
        const correoTrimmed = req.body.correo.trim().toLowerCase();
        const existingCorreo = await Empleado.findOne({
          where: {
            correo: correoTrimmed,
            id_empleado: { [Sequelize.Op.ne]: id }
          }
        });
        if (existingCorreo) {
          return res.status(409).json({
            status: 'error',
            message: `El correo electrónico '${correoTrimmed}' ya está registrado.`
          });
        }
      }

      const updateData = {};
      if (req.body.id_departamento !== undefined) updateData.id_departamento = validateId(req.body.id_departamento);
      if (req.body.id_usuario !== undefined) updateData.id_usuario = idUsuarioUpdate;
      if (req.body.nombre !== undefined) updateData.nombre = req.body.nombre.trim();
      if (req.body.apellido !== undefined) updateData.apellido = req.body.apellido.trim();
      if (req.body.correo !== undefined) updateData.correo = req.body.correo.trim().toLowerCase();
      if (req.body.telefono !== undefined) {
        updateData.telefono = req.body.telefono ? req.body.telefono.trim() : null;
      }
      if (req.body.cargo !== undefined) updateData.cargo = req.body.cargo.trim();
      if (req.body.activo !== undefined) updateData.activo = req.body.activo;

      await empleado.update(updateData);

      const empleadoActualizado = await Empleado.findByPk(id, {
        include: [
          {
            model: Departamento,
            as: 'departamento',
            attributes: ['id_departamento', 'codigo', 'nombre']
          },
          {
            model: Usuario,
            as: 'usuario',
            attributes: ['id_usuario', 'nombre', 'correo', 'fecha_creacion']
          }
        ]
      });

      return res.status(200).json({
        status: 'success',
        data: empleadoActualizado
      });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          status: 'error',
          message: 'El correo electrónico o usuario ya está registrado en otro empleado.'
        });
      }
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join(', ')
        });
      }
      console.error('Error al actualizar empleado:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al actualizar el empleado.'
      });
    }
  },

  async eliminarEmpleado(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El identificador debe ser un número entero positivo.'
        });
      }

      const empleado = await Empleado.findByPk(id);
      if (!empleado) {
        return res.status(404).json({
          status: 'error',
          message: `Empleado con ID ${id} no encontrado.`
        });
      }

      // 1. Verificar dependencia con CampañaMarketing (ON DELETE RESTRICT)
      if (CampañaMarketing) {
        const countCampanas = await CampañaMarketing.count({
          where: { id_empleado_responsable: id }
        });
        if (countCampanas > 0) {
          return res.status(409).json({
            status: 'error',
            message: 'No se puede eliminar el empleado porque es responsable de una o más campañas de marketing.'
          });
        }
      }

      // 2. Verificar dependencia con Cotizacion (ON DELETE RESTRICT)
      if (Cotizacion) {
        const countCotizaciones = await Cotizacion.count({
          where: { id_empleado: id }
        });
        if (countCotizaciones > 0) {
          return res.status(409).json({
            status: 'error',
            message: 'No se puede eliminar el empleado porque tiene cotizaciones asociadas.'
          });
        }
      }

      // 3. Verificar dependencia con Contrato (ON DELETE RESTRICT)
      if (Contrato) {
        const countContratos = await Contrato.count({
          where: { id_empleado_aprobador: id }
        });
        if (countContratos > 0) {
          return res.status(409).json({
            status: 'error',
            message: 'No se puede eliminar el empleado porque es aprobador de uno o más contratos.'
          });
        }
      }

      await empleado.destroy();

      return res.status(200).json({
        status: 'success',
        message: 'Empleado eliminado exitosamente.'
      });
    } catch (err) {
      if (
        err.name === 'SequelizeForeignKeyConstraintError' ||
        (err.original && (err.original.code === 'ER_ROW_IS_REFERENCED_2' || err.original.errno === 1451))
      ) {
        return res.status(409).json({
          status: 'error',
          message: 'No se puede eliminar el empleado porque tiene registros comerciales asociados.'
        });
      }

      console.error('Error al eliminar empleado:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al eliminar el empleado.'
      });
    }
  }
};

module.exports = empleadoController;

