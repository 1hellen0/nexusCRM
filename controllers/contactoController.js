'use strict';

const { Contacto, EmpresaCliente } = require('../models');

const ALLOWED_FIELDS = ['id_empresa', 'nombre', 'cargo', 'correo', 'telefono'];
const PROTECTED_FIELDS = ['id_contacto', 'fecha_registro'];
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

function validateContactoPayload(data, isUpdate = false) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'El cuerpo de la solicitud debe ser un objeto JSON válido.';
  }

  const disallowed = checkDisallowedFields(data);
  if (disallowed) return disallowed;

  if (!isUpdate) {
    if (data.id_empresa === undefined || data.id_empresa === null) {
      return 'El campo id_empresa es obligatorio.';
    }
    if (!data.nombre || typeof data.nombre !== 'string' || data.nombre.trim() === '') {
      return 'El campo nombre es obligatorio.';
    }
    if (!data.correo || typeof data.correo !== 'string' || data.correo.trim() === '') {
      return 'El campo correo es obligatorio.';
    }
  }

  if (data.id_empresa !== undefined) {
    const idEmpresaNum = validateId(data.id_empresa);
    if (!idEmpresaNum) {
      return 'El campo id_empresa debe ser un número entero positivo.';
    }
  }

  if (data.nombre !== undefined) {
    if (typeof data.nombre !== 'string' || data.nombre.trim() === '') {
      return 'El nombre del contacto no puede estar vacío.';
    }
    if (data.nombre.length > 120) {
      return 'El nombre no puede superar los 120 caracteres.';
    }
  }

  if (data.cargo !== undefined && data.cargo !== null) {
    if (typeof data.cargo !== 'string') {
      return 'El cargo debe ser una cadena de texto.';
    }
    if (data.cargo.length > 100) {
      return 'El cargo no puede superar los 100 caracteres.';
    }
  }

  if (data.correo !== undefined) {
    if (typeof data.correo !== 'string' || data.correo.trim() === '') {
      return 'El correo electrónico no puede estar vacío.';
    }
    if (!EMAIL_REGEX.test(data.correo.trim())) {
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

  return null;
}

const contactoController = {
  async crearContacto(req, res) {
    try {
      const validationError = validateContactoPayload(req.body, false);
      if (validationError) {
        return res.status(400).json({
          status: 'error',
          message: validationError
        });
      }

      const idEmpresa = validateId(req.body.id_empresa);
      const empresa = await EmpresaCliente.findByPk(idEmpresa);
      if (!empresa) {
        return res.status(404).json({
          status: 'error',
          message: `La empresa con ID ${idEmpresa} no existe.`
        });
      }

      const payload = {
        id_empresa: idEmpresa,
        nombre: req.body.nombre.trim(),
        cargo: req.body.cargo ? req.body.cargo.trim() : null,
        correo: req.body.correo.trim(),
        telefono: req.body.telefono ? req.body.telefono.trim() : null
      };

      const nuevoContacto = await Contacto.create(payload);

      return res.status(201).json({
        status: 'success',
        data: nuevoContacto
      });
    } catch (err) {
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join(', ')
        });
      }
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(404).json({
          status: 'error',
          message: 'La empresa especificada no existe.'
        });
      }
      console.error('Error al crear contacto:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al crear el contacto.'
      });
    }
  },

  async listarContactos(req, res) {
    try {
      const contactos = await Contacto.findAll({
        order: [['id_contacto', 'ASC']],
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
        total: contactos.length,
        data: contactos
      });
    } catch (err) {
      console.error('Error al listar contactos:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al consultar contactos.'
      });
    }
  },

  async obtenerContacto(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El identificador debe ser un número entero positivo.'
        });
      }

      const contacto = await Contacto.findByPk(id, {
        include: [
          {
            model: EmpresaCliente,
            as: 'empresa',
            attributes: ['id_empresa', 'nombre', 'sector', 'correo', 'telefono', 'estado']
          }
        ]
      });

      if (!contacto) {
        return res.status(404).json({
          status: 'error',
          message: `Contacto con ID ${id} no encontrado.`
        });
      }

      return res.status(200).json({
        status: 'success',
        data: contacto
      });
    } catch (err) {
      console.error('Error al obtener contacto:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al obtener el contacto.'
      });
    }
  },

  async actualizarContacto(req, res) {
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

      const validationError = validateContactoPayload(req.body, true);
      if (validationError) {
        return res.status(400).json({
          status: 'error',
          message: validationError
        });
      }

      const contacto = await Contacto.findByPk(id);
      if (!contacto) {
        return res.status(404).json({
          status: 'error',
          message: `Contacto con ID ${id} no encontrado.`
        });
      }

      const updateData = {};

      if (req.body.id_empresa !== undefined) {
        const idEmpresaNum = validateId(req.body.id_empresa);
        const empresa = await EmpresaCliente.findByPk(idEmpresaNum);
        if (!empresa) {
          return res.status(404).json({
            status: 'error',
            message: `La empresa con ID ${idEmpresaNum} no existe.`
          });
        }
        updateData.id_empresa = idEmpresaNum;
      }

      if (req.body.nombre !== undefined) updateData.nombre = req.body.nombre.trim();
      if (req.body.cargo !== undefined) updateData.cargo = req.body.cargo ? req.body.cargo.trim() : null;
      if (req.body.correo !== undefined) updateData.correo = req.body.correo.trim();
      if (req.body.telefono !== undefined) updateData.telefono = req.body.telefono ? req.body.telefono.trim() : null;

      await contacto.update(updateData);

      const contactoActualizado = await Contacto.findByPk(id, {
        include: [{ model: EmpresaCliente, as: 'empresa' }]
      });

      return res.status(200).json({
        status: 'success',
        data: contactoActualizado
      });
    } catch (err) {
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join(', ')
        });
      }
      if (
        err.name === 'SequelizeForeignKeyConstraintError' ||
        (err.original && (err.original.code === 'ER_ROW_IS_REFERENCED_2' || err.original.code === 'ER_NO_REFERENCED_ROW_2'))
      ) {
        return res.status(409).json({
          status: 'error',
          message: 'No se puede modificar la empresa del contacto porque tiene oportunidades comerciales asociadas con la empresa actual.'
        });
      }
      console.error('Error al actualizar contacto:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al actualizar el contacto.'
      });
    }
  },

  async eliminarContacto(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El identificador debe ser un número entero positivo.'
        });
      }

      const contacto = await Contacto.findByPk(id);
      if (!contacto) {
        return res.status(404).json({
          status: 'error',
          message: `Contacto con ID ${id} no encontrado.`
        });
      }

      await contacto.destroy();

      return res.status(200).json({
        status: 'success',
        message: 'Contacto eliminado exitosamente.'
      });
    } catch (err) {
      if (
        err.name === 'SequelizeForeignKeyConstraintError' ||
        (err.original && (err.original.code === 'ER_ROW_IS_REFERENCED_2' || err.original.errno === 1451))
      ) {
        return res.status(409).json({
          status: 'error',
          message: 'No se puede eliminar el contacto porque tiene oportunidades comerciales asociadas.'
        });
      }

      console.error('Error al eliminar contacto:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al eliminar el contacto.'
      });
    }
  }
};

module.exports = contactoController;

