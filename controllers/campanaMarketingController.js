'use strict';

const {
  CampañaMarketing,
  Empleado,
  Departamento,
  Usuario,
  OportunidadComercial,
  Sequelize
} = require('../models');

const ALLOWED_FIELDS = [
  'id_empleado_responsable',
  'nombre',
  'tipo',
  'presupuesto',
  'fecha_inicio',
  'fecha_fin',
  'estado'
];
const PROTECTED_FIELDS = ['id_campana'];
const TIPOS_PERMITIDOS = ['Email', 'Webinar', 'Feria', 'Digital', 'Directa'];
const ESTADOS_PERMITIDOS = ['Planificada', 'Activa', 'Finalizada', 'Cancelada'];

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

function isValidDateFormat(dateStr) {
  if (typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr + 'T00:00:00.000Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dateStr;
}

function validatePresupuesto(val) {
  if (val === undefined || val === null || val === '') {
    return null;
  }
  if (typeof val !== 'number' && typeof val !== 'string') {
    return 'El presupuesto debe ser un valor numérico o cadena numérica válida.';
  }
  const str = String(val).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    return 'El presupuesto debe ser un número decimal válido mayor o igual a 0 con máximo 2 decimales.';
  }
  const parts = str.split('.');
  if (parts[0].length > 10) {
    return 'El presupuesto excede el límite permitido para DECIMAL(12,2) (máximo 10 dígitos enteros).';
  }
  const num = parseFloat(str);
  if (isNaN(num) || num < 0) {
    return 'El presupuesto no puede ser negativo.';
  }
  return null;
}

function validateCampanaPayload(data, isUpdate = false) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'El cuerpo de la solicitud debe ser un objeto JSON válido.';
  }

  const disallowed = checkDisallowedFields(data);
  if (disallowed) return disallowed;

  if (!isUpdate) {
    if (data.id_empleado_responsable === undefined || data.id_empleado_responsable === null) {
      return 'El campo id_empleado_responsable es obligatorio.';
    }
    if (!data.nombre || typeof data.nombre !== 'string' || data.nombre.trim() === '') {
      return 'El campo nombre es obligatorio.';
    }
    if (!data.tipo || typeof data.tipo !== 'string' || data.tipo.trim() === '') {
      return 'El campo tipo es obligatorio.';
    }
    if (!data.fecha_inicio || typeof data.fecha_inicio !== 'string' || data.fecha_inicio.trim() === '') {
      return 'El campo fecha_inicio es obligatorio.';
    }
  }

  if (data.id_empleado_responsable !== undefined) {
    const idEmpNum = validateId(data.id_empleado_responsable);
    if (!idEmpNum) {
      return 'El campo id_empleado_responsable debe ser un número entero positivo.';
    }
  }

  if (data.nombre !== undefined) {
    if (typeof data.nombre !== 'string' || data.nombre.trim() === '') {
      return 'El nombre no puede estar vacío.';
    }
    if (data.nombre.trim().length > 120) {
      return 'El nombre no puede superar los 120 caracteres.';
    }
  }

  if (data.tipo !== undefined) {
    if (typeof data.tipo !== 'string' || !TIPOS_PERMITIDOS.includes(data.tipo.trim())) {
      return `El campo tipo debe ser uno de los siguientes valores permitidos: ${TIPOS_PERMITIDOS.join(', ')}.`;
    }
  }

  if (data.presupuesto !== undefined) {
    const errPresupuesto = validatePresupuesto(data.presupuesto);
    if (errPresupuesto) return errPresupuesto;
  }

  if (data.fecha_inicio !== undefined) {
    if (!isValidDateFormat(data.fecha_inicio.trim())) {
      return 'La fecha_inicio debe tener el formato válido YYYY-MM-DD.';
    }
  }

  if (data.fecha_fin !== undefined && data.fecha_fin !== null && data.fecha_fin !== '') {
    if (!isValidDateFormat(data.fecha_fin.trim())) {
      return 'La fecha_fin debe tener el formato válido YYYY-MM-DD o ser null.';
    }
  }

  // Coherencia de fechas si ambas vienen en el payload
  if (data.fecha_inicio && data.fecha_fin) {
    const fInicio = data.fecha_inicio.trim();
    const fFin = data.fecha_fin.trim();
    if (fFin < fInicio) {
      return 'La fecha de finalización (fecha_fin) no puede ser anterior a la fecha de inicio (fecha_inicio).';
    }
  }

  if (data.estado !== undefined) {
    if (typeof data.estado !== 'string' || !ESTADOS_PERMITIDOS.includes(data.estado.trim())) {
      return `El campo estado debe ser uno de los siguientes valores permitidos: ${ESTADOS_PERMITIDOS.join(', ')}.`;
    }
  }

  return null;
}

const campanaMarketingController = {
  async listarCampanas(req, res) {
    try {
      const where = {};

      if (req.query.tipo !== undefined && typeof req.query.tipo === 'string') {
        const tipoTrim = req.query.tipo.trim();
        if (TIPOS_PERMITIDOS.includes(tipoTrim)) {
          where.tipo = tipoTrim;
        }
      }

      if (req.query.estado !== undefined && typeof req.query.estado === 'string') {
        const estadoTrim = req.query.estado.trim();
        if (ESTADOS_PERMITIDOS.includes(estadoTrim)) {
          where.estado = estadoTrim;
        }
      }

      if (req.query.id_empleado_responsable !== undefined) {
        const idEmp = validateId(req.query.id_empleado_responsable);
        if (idEmp) {
          where.id_empleado_responsable = idEmp;
        }
      }

      const campanas = await CampañaMarketing.findAll({
        where,
        include: [
          {
            model: Empleado,
            as: 'responsable',
            attributes: [
              'id_empleado',
              'id_departamento',
              'id_usuario',
              'nombre',
              'apellido',
              'correo',
              'telefono',
              'cargo',
              'activo'
            ],
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
          },
          {
            model: OportunidadComercial,
            as: 'oportunidades',
            attributes: [
              'id_oportunidad',
              'id_empresa',
              'id_contacto',
              'id_campana',
              'titulo',
              'valor_estimado',
              'etapa',
              'fecha_creacion',
              'fecha_cierre_estimada'
            ]
          }
        ],
        order: [['id_campana', 'ASC']]
      });

      return res.status(200).json({
        status: 'success',
        total: campanas.length,
        data: campanas
      });
    } catch (err) {
      console.error('Error al listar campañas de marketing:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al consultar campañas de marketing.'
      });
    }
  },

  async obtenerCampana(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El parámetro ID debe ser un número entero positivo válido.'
        });
      }

      const campana = await CampañaMarketing.findByPk(id, {
        include: [
          {
            model: Empleado,
            as: 'responsable',
            attributes: [
              'id_empleado',
              'id_departamento',
              'id_usuario',
              'nombre',
              'apellido',
              'correo',
              'telefono',
              'cargo',
              'activo'
            ],
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
          },
          {
            model: OportunidadComercial,
            as: 'oportunidades',
            attributes: [
              'id_oportunidad',
              'id_empresa',
              'id_contacto',
              'id_campana',
              'titulo',
              'valor_estimado',
              'etapa',
              'fecha_creacion',
              'fecha_cierre_estimada'
            ]
          }
        ]
      });

      if (!campana) {
        return res.status(404).json({
          status: 'error',
          message: `Campaña de marketing con ID ${id} no encontrada.`
        });
      }

      return res.status(200).json({
        status: 'success',
        data: campana
      });
    } catch (err) {
      console.error('Error al obtener campaña de marketing por ID:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al obtener la campaña de marketing.'
      });
    }
  },

  async crearCampana(req, res) {
    try {
      const errorValidacion = validateCampanaPayload(req.body, false);
      if (errorValidacion) {
        return res.status(400).json({
          status: 'error',
          message: errorValidacion
        });
      }

      const {
        id_empleado_responsable,
        nombre,
        tipo,
        presupuesto,
        fecha_inicio,
        fecha_fin,
        estado
      } = req.body;

      // Verificar que el empleado responsable exista
      const empleado = await Empleado.findByPk(id_empleado_responsable);
      if (!empleado) {
        return res.status(404).json({
          status: 'error',
          message: `El empleado responsable con ID ${id_empleado_responsable} no existe.`
        });
      }

      const nuevaCampana = await CampañaMarketing.create({
        id_empleado_responsable,
        nombre: nombre.trim(),
        tipo: tipo.trim(),
        presupuesto: presupuesto !== undefined && presupuesto !== null && presupuesto !== '' ? presupuesto : 0.00,
        fecha_inicio: fecha_inicio.trim(),
        fecha_fin: fecha_fin && fecha_fin.trim() !== '' ? fecha_fin.trim() : null,
        estado: estado ? estado.trim() : 'Planificada'
      });

      const campanaConAsociaciones = await CampañaMarketing.findByPk(nuevaCampana.id_campana, {
        include: [
          {
            model: Empleado,
            as: 'responsable',
            attributes: [
              'id_empleado',
              'id_departamento',
              'id_usuario',
              'nombre',
              'apellido',
              'correo',
              'telefono',
              'cargo',
              'activo'
            ],
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
          },
          {
            model: OportunidadComercial,
            as: 'oportunidades',
            attributes: [
              'id_oportunidad',
              'id_empresa',
              'id_contacto',
              'id_campana',
              'titulo',
              'valor_estimado',
              'etapa',
              'fecha_creacion',
              'fecha_cierre_estimada'
            ]
          }
        ]
      });

      return res.status(201).json({
        status: 'success',
        message: 'Campaña de marketing creada exitosamente.',
        data: campanaConAsociaciones
      });
    } catch (err) {
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join('. ')
        });
      }
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(404).json({
          status: 'error',
          message: 'Violación de clave foránea: el empleado responsable no existe.'
        });
      }

      console.error('Error al crear campaña de marketing:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al crear la campaña de marketing.'
      });
    }
  },

  async actualizarCampana(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El parámetro ID debe ser un número entero positivo válido.'
        });
      }

      if (Object.keys(req.body).length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Debe proporcionar al menos un campo para actualizar.'
        });
      }

      const errorValidacion = validateCampanaPayload(req.body, true);
      if (errorValidacion) {
        return res.status(400).json({
          status: 'error',
          message: errorValidacion
        });
      }

      const campana = await CampañaMarketing.findByPk(id);
      if (!campana) {
        return res.status(404).json({
          status: 'error',
          message: `Campaña de marketing con ID ${id} no encontrada.`
        });
      }

      const {
        id_empleado_responsable,
        nombre,
        tipo,
        presupuesto,
        fecha_inicio,
        fecha_fin,
        estado
      } = req.body;

      if (id_empleado_responsable !== undefined) {
        const empleado = await Empleado.findByPk(id_empleado_responsable);
        if (!empleado) {
          return res.status(404).json({
            status: 'error',
            message: `El empleado responsable con ID ${id_empleado_responsable} no existe.`
          });
        }
        campana.id_empleado_responsable = id_empleado_responsable;
      }

      // Comprobar coherencia de fechas contra el estado actual o nuevo
      const effectiveFechaInicio = fecha_inicio !== undefined ? fecha_inicio.trim() : campana.fecha_inicio;
      const effectiveFechaFin = fecha_fin !== undefined
        ? (fecha_fin && fecha_fin.trim() !== '' ? fecha_fin.trim() : null)
        : campana.fecha_fin;

      if (effectiveFechaInicio && effectiveFechaFin) {
        if (effectiveFechaFin < effectiveFechaInicio) {
          return res.status(400).json({
            status: 'error',
            message: 'La fecha de finalización (fecha_fin) no puede ser anterior a la fecha de inicio (fecha_inicio).'
          });
        }
      }

      if (nombre !== undefined) {
        campana.nombre = nombre.trim();
      }

      if (tipo !== undefined) {
        campana.tipo = tipo.trim();
      }

      if (presupuesto !== undefined) {
        campana.presupuesto = presupuesto;
      }

      if (fecha_inicio !== undefined) {
        campana.fecha_inicio = effectiveFechaInicio;
      }

      if (fecha_fin !== undefined) {
        campana.fecha_fin = effectiveFechaFin;
      }

      if (estado !== undefined) {
        campana.estado = estado.trim();
      }

      await campana.save();

      const campanaActualizada = await CampañaMarketing.findByPk(id, {
        include: [
          {
            model: Empleado,
            as: 'responsable',
            attributes: [
              'id_empleado',
              'id_departamento',
              'id_usuario',
              'nombre',
              'apellido',
              'correo',
              'telefono',
              'cargo',
              'activo'
            ],
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
          },
          {
            model: OportunidadComercial,
            as: 'oportunidades',
            attributes: [
              'id_oportunidad',
              'id_empresa',
              'id_contacto',
              'id_campana',
              'titulo',
              'valor_estimado',
              'etapa',
              'fecha_creacion',
              'fecha_cierre_estimada'
            ]
          }
        ]
      });

      return res.status(200).json({
        status: 'success',
        message: 'Campaña de marketing actualizada exitosamente.',
        data: campanaActualizada
      });
    } catch (err) {
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join('. ')
        });
      }
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(404).json({
          status: 'error',
          message: 'Violación de clave foránea: el empleado responsable no existe.'
        });
      }

      console.error('Error al actualizar campaña de marketing:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al actualizar la campaña de marketing.'
      });
    }
  },

  async eliminarCampana(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El parámetro ID debe ser un número entero positivo válido.'
        });
      }

      const campana = await CampañaMarketing.findByPk(id);
      if (!campana) {
        return res.status(404).json({
          status: 'error',
          message: `Campaña de marketing con ID ${id} no encontrada.`
        });
      }

      await campana.destroy();

      return res.status(200).json({
        status: 'success',
        message: 'Campaña de marketing eliminada exitosamente.'
      });
    } catch (err) {
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(409).json({
          status: 'error',
          error: 'Conflicto de integridad referencial',
          message: 'No se puede eliminar la campaña de marketing porque está referenciada por otros registros.'
        });
      }

      console.error('Error al eliminar campaña de marketing:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al eliminar la campaña de marketing.'
      });
    }
  }
};

module.exports = campanaMarketingController;

