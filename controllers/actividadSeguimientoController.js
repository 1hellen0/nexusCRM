'use strict';

const { ActividadSeguimiento, OportunidadComercial } = require('../models');

const ALLOWED_FIELDS = ['id_oportunidad', 'tipo', 'descripcion', 'fecha_actividad', 'estado'];
const PROTECTED_FIELDS = ['id_actividad'];
const VALID_TIPOS = ['Llamada', 'Reunion', 'Correo', 'Otro'];
const VALID_ESTADOS = ['Pendiente', 'Completada', 'Cancelada'];

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

function isValidDateTime(val) {
  if (typeof val !== 'string' || val.trim() === '') return false;
  const parsed = Date.parse(val);
  if (isNaN(parsed)) return false;

  const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const testDate = new Date(y, m - 1, d);
    if (testDate.getFullYear() !== y || testDate.getMonth() !== m - 1 || testDate.getDate() !== d) {
      return false;
    }
  }
  return true;
}

function validateActividadPayload(data, isUpdate = false) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'El cuerpo de la solicitud debe ser un objeto JSON válido.';
  }

  const disallowed = checkDisallowedFields(data);
  if (disallowed) return disallowed;

  if (!isUpdate) {
    if (data.id_oportunidad === undefined || data.id_oportunidad === null) {
      return 'El campo id_oportunidad es obligatorio.';
    }
    if (!data.tipo || typeof data.tipo !== 'string' || data.tipo.trim() === '') {
      return 'El campo tipo es obligatorio.';
    }
    if (!data.descripcion || typeof data.descripcion !== 'string' || data.descripcion.trim() === '') {
      return 'El campo descripcion es obligatorio.';
    }
    if (!data.fecha_actividad) {
      return 'El campo fecha_actividad es obligatorio.';
    }
  }

  if (data.id_oportunidad !== undefined) {
    const idOpNum = validateId(data.id_oportunidad);
    if (!idOpNum) {
      return 'El campo id_oportunidad debe ser un número entero positivo.';
    }
  }

  if (data.tipo !== undefined) {
    if (!VALID_TIPOS.includes(data.tipo)) {
      return `El tipo es inválido. Valores permitidos: ${VALID_TIPOS.join(', ')}.`;
    }
  }

  if (data.descripcion !== undefined) {
    if (typeof data.descripcion !== 'string' || data.descripcion.trim() === '') {
      return 'La descripción no puede estar vacía.';
    }
  }

  if (data.fecha_actividad !== undefined) {
    if (!isValidDateTime(data.fecha_actividad)) {
      return 'La fecha_actividad debe ser una fecha y hora válida (ejemplo: YYYY-MM-DD HH:mm:ss o formato ISO).';
    }
  }

  if (data.estado !== undefined) {
    if (!VALID_ESTADOS.includes(data.estado)) {
      return `El estado es inválido. Valores permitidos: ${VALID_ESTADOS.join(', ')}.`;
    }
  }

  return null;
}

const actividadSeguimientoController = {
  async crearActividad(req, res) {
    try {
      const validationError = validateActividadPayload(req.body, false);
      if (validationError) {
        return res.status(400).json({
          status: 'error',
          message: validationError
        });
      }

      const idOportunidad = validateId(req.body.id_oportunidad);
      const oportunidad = await OportunidadComercial.findByPk(idOportunidad);
      if (!oportunidad) {
        return res.status(404).json({
          status: 'error',
          message: `La oportunidad comercial con ID ${idOportunidad} no existe.`
        });
      }

      const payload = {
        id_oportunidad: idOportunidad,
        tipo: req.body.tipo,
        descripcion: req.body.descripcion.trim(),
        fecha_actividad: new Date(req.body.fecha_actividad),
        estado: req.body.estado || 'Pendiente'
      };

      const nuevaActividad = await ActividadSeguimiento.create(payload);

      return res.status(201).json({
        status: 'success',
        data: nuevaActividad
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
          message: 'La oportunidad comercial indicada no existe.'
        });
      }
      console.error('Error al crear actividad de seguimiento:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al crear la actividad de seguimiento.'
      });
    }
  },

  async listarActividades(req, res) {
    try {
      const actividades = await ActividadSeguimiento.findAll({
        order: [['id_actividad', 'ASC']],
        include: [
          {
            model: OportunidadComercial,
            as: 'oportunidad',
            attributes: ['id_oportunidad', 'id_empresa', 'id_contacto', 'titulo', 'valor_estimado', 'etapa']
          }
        ]
      });

      return res.status(200).json({
        status: 'success',
        total: actividades.length,
        data: actividades
      });
    } catch (err) {
      console.error('Error al listar actividades:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al consultar actividades de seguimiento.'
      });
    }
  },

  async obtenerActividad(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El identificador debe ser un número entero positivo.'
        });
      }

      const actividad = await ActividadSeguimiento.findByPk(id, {
        include: [
          {
            model: OportunidadComercial,
            as: 'oportunidad',
            attributes: ['id_oportunidad', 'id_empresa', 'id_contacto', 'titulo', 'valor_estimado', 'etapa', 'fecha_creacion']
          }
        ]
      });

      if (!actividad) {
        return res.status(404).json({
          status: 'error',
          message: `Actividad de seguimiento con ID ${id} no encontrada.`
        });
      }

      return res.status(200).json({
        status: 'success',
        data: actividad
      });
    } catch (err) {
      console.error('Error al obtener actividad:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al obtener la actividad de seguimiento.'
      });
    }
  },

  async actualizarActividad(req, res) {
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

      const validationError = validateActividadPayload(req.body, true);
      if (validationError) {
        return res.status(400).json({
          status: 'error',
          message: validationError
        });
      }

      const actividad = await ActividadSeguimiento.findByPk(id);
      if (!actividad) {
        return res.status(404).json({
          status: 'error',
          message: `Actividad de seguimiento con ID ${id} no encontrada.`
        });
      }

      const updateData = {};

      if (req.body.id_oportunidad !== undefined) {
        const idOpNum = validateId(req.body.id_oportunidad);
        const oportunidad = await OportunidadComercial.findByPk(idOpNum);
        if (!oportunidad) {
          return res.status(404).json({
            status: 'error',
            message: `La oportunidad comercial con ID ${idOpNum} no existe.`
          });
        }
        updateData.id_oportunidad = idOpNum;
      }

      if (req.body.tipo !== undefined) updateData.tipo = req.body.tipo;
      if (req.body.descripcion !== undefined) updateData.descripcion = req.body.descripcion.trim();
      if (req.body.fecha_actividad !== undefined) updateData.fecha_actividad = new Date(req.body.fecha_actividad);
      if (req.body.estado !== undefined) updateData.estado = req.body.estado;

      await actividad.update(updateData);

      const actividadActualizada = await ActividadSeguimiento.findByPk(id, {
        include: [{ model: OportunidadComercial, as: 'oportunidad' }]
      });

      return res.status(200).json({
        status: 'success',
        data: actividadActualizada
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
          message: 'La oportunidad comercial indicada no existe.'
        });
      }
      console.error('Error al actualizar actividad:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al actualizar la actividad de seguimiento.'
      });
    }
  },

  async eliminarActividad(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El identificador debe ser un número entero positivo.'
        });
      }

      const actividad = await ActividadSeguimiento.findByPk(id);
      if (!actividad) {
        return res.status(404).json({
          status: 'error',
          message: `Actividad de seguimiento con ID ${id} no encontrada.`
        });
      }

      await actividad.destroy();

      return res.status(200).json({
        status: 'success',
        message: 'Actividad de seguimiento eliminada exitosamente.'
      });
    } catch (err) {
      if (
        err.name === 'SequelizeForeignKeyConstraintError' ||
        (err.original && (err.original.code === 'ER_ROW_IS_REFERENCED_2' || err.original.errno === 1451))
      ) {
        return res.status(409).json({
          status: 'error',
          message: 'No se puede eliminar la actividad de seguimiento debido a restricciones de integridad referencial.'
        });
      }

      console.error('Error al eliminar actividad:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al eliminar la actividad de seguimiento.'
      });
    }
  }
};

module.exports = actividadSeguimientoController;

