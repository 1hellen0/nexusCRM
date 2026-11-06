'use strict';

const {
  Cotizacion,
  OportunidadComercial,
  Empleado,
  Departamento,
  Usuario,
  DetalleCotizacion,
  Contrato,
  Sequelize
} = require('../models');
const { Op } = Sequelize;

const ALLOWED_FIELDS = [
  'id_oportunidad',
  'id_empleado',
  'numero_cotizacion',
  'version',
  'fecha_emision',
  'fecha_vencimiento',
  'subtotal',
  'total',
  'estado'
];
const PROTECTED_FIELDS = ['id_cotizacion'];
const ESTADOS_PERMITIDOS = ['Borrador', 'Enviada', 'Aprobada', 'Rechazada', 'Vencida'];

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

function validateDecimal(val, fieldName) {
  if (val === undefined || val === null || val === '') {
    return `El campo ${fieldName} es obligatorio.`;
  }
  if (typeof val !== 'number' && typeof val !== 'string') {
    return `El campo ${fieldName} debe ser un valor numérico o cadena numérica válida.`;
  }
  const str = String(val).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    return `El campo ${fieldName} debe ser un número decimal válido mayor o igual a 0 con máximo 2 decimales.`;
  }
  const parts = str.split('.');
  if (parts[0].length > 10) {
    return `El campo ${fieldName} excede el límite permitido para DECIMAL(12,2) (máximo 10 dígitos enteros).`;
  }
  const num = parseFloat(str);
  if (isNaN(num) || num < 0) {
    return `El campo ${fieldName} no puede ser negativo.`;
  }
  return null;
}

function validateCotizacionPayload(data, isUpdate = false) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'El cuerpo de la solicitud debe ser un objeto JSON válido.';
  }

  const disallowed = checkDisallowedFields(data);
  if (disallowed) return disallowed;

  if (!isUpdate) {
    if (data.id_oportunidad === undefined || data.id_oportunidad === null) {
      return 'El campo id_oportunidad es obligatorio.';
    }
    if (data.id_empleado === undefined || data.id_empleado === null) {
      return 'El campo id_empleado es obligatorio.';
    }
    if (!data.numero_cotizacion || typeof data.numero_cotizacion !== 'string' || data.numero_cotizacion.trim() === '') {
      return 'El campo numero_cotizacion es obligatorio.';
    }
    if (!data.fecha_emision || typeof data.fecha_emision !== 'string' || data.fecha_emision.trim() === '') {
      return 'El campo fecha_emision es obligatorio.';
    }
    if (!data.fecha_vencimiento || typeof data.fecha_vencimiento !== 'string' || data.fecha_vencimiento.trim() === '') {
      return 'El campo fecha_vencimiento es obligatorio.';
    }
    if (data.subtotal === undefined || data.subtotal === null || data.subtotal === '') {
      return 'El campo subtotal es obligatorio.';
    }
    if (data.total === undefined || data.total === null || data.total === '') {
      return 'El campo total es obligatorio.';
    }
  }

  if (data.id_oportunidad !== undefined) {
    const idOportNum = validateId(data.id_oportunidad);
    if (!idOportNum) {
      return 'El campo id_oportunidad debe ser un número entero positivo.';
    }
  }

  if (data.id_empleado !== undefined) {
    const idEmpNum = validateId(data.id_empleado);
    if (!idEmpNum) {
      return 'El campo id_empleado debe ser un número entero positivo.';
    }
  }

  if (data.numero_cotizacion !== undefined) {
    if (typeof data.numero_cotizacion !== 'string' || data.numero_cotizacion.trim() === '') {
      return 'El numero_cotizacion no puede estar vacío.';
    }
    if (data.numero_cotizacion.trim().length > 40) {
      return 'El numero_cotizacion no puede superar los 40 caracteres.';
    }
  }

  if (data.version !== undefined) {
    if (typeof data.version !== 'number' || !Number.isInteger(data.version) || data.version < 1) {
      return 'El campo version debe ser un número entero mayor o igual a 1.';
    }
  }

  if (data.fecha_emision !== undefined) {
    if (!isValidDateFormat(data.fecha_emision.trim())) {
      return 'La fecha_emision debe tener el formato válido YYYY-MM-DD.';
    }
  }

  if (data.fecha_vencimiento !== undefined) {
    if (!isValidDateFormat(data.fecha_vencimiento.trim())) {
      return 'La fecha_vencimiento debe tener el formato válido YYYY-MM-DD.';
    }
  }

  // Coherencia de fechas si ambas vienen en el payload
  if (data.fecha_emision && data.fecha_vencimiento) {
    const fEmision = data.fecha_emision.trim();
    const fVencimiento = data.fecha_vencimiento.trim();
    if (fVencimiento < fEmision) {
      return 'La fecha de vencimiento (fecha_vencimiento) no puede ser anterior a la fecha de emisión (fecha_emision).';
    }
  }

  if (data.subtotal !== undefined) {
    const errSubtotal = validateDecimal(data.subtotal, 'subtotal');
    if (errSubtotal) return errSubtotal;
  }

  if (data.total !== undefined) {
    const errTotal = validateDecimal(data.total, 'total');
    if (errTotal) return errTotal;
  }

  if (data.estado !== undefined) {
    if (typeof data.estado !== 'string' || !ESTADOS_PERMITIDOS.includes(data.estado.trim())) {
      return `El campo estado debe ser uno de los siguientes valores permitidos: ${ESTADOS_PERMITIDOS.join(', ')}.`;
    }
  }

  return null;
}

const INCLUDES_COTIZACION = [
  {
    model: OportunidadComercial,
    as: 'oportunidad',
    attributes: [
      'id_oportunidad',
      'id_empresa',
      'id_contacto',
      'id_campana',
      'titulo',
      'valor_estimado',
      'etapa',
      'fecha_creacion'
    ]
  },
  {
    model: Empleado,
    as: 'empleado',
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
    model: DetalleCotizacion,
    as: 'detalles',
    attributes: [
      'id_detalle_cotizacion',
      'id_cotizacion',
      'id_producto',
      'cantidad',
      'precio_unitario_pactado',
      'descuento_porcentaje',
      'subtotal_linea'
    ]
  },
  {
    model: Contrato,
    as: 'contrato',
    attributes: [
      'id_contrato',
      'id_empresa',
      'id_cotizacion',
      'numero_contrato',
      'fecha_inicio',
      'fecha_fin',
      'monto_acordado',
      'estado'
    ]
  }
];

const cotizacionController = {
  async listarCotizaciones(req, res) {
    try {
      const where = {};

      if (req.query.estado !== undefined && typeof req.query.estado === 'string') {
        const estadoTrim = req.query.estado.trim();
        if (ESTADOS_PERMITIDOS.includes(estadoTrim)) {
          where.estado = estadoTrim;
        }
      }

      if (req.query.id_oportunidad !== undefined) {
        const idOport = validateId(req.query.id_oportunidad);
        if (idOport) {
          where.id_oportunidad = idOport;
        }
      }

      if (req.query.id_empleado !== undefined) {
        const idEmp = validateId(req.query.id_empleado);
        if (idEmp) {
          where.id_empleado = idEmp;
        }
      }

      const cotizaciones = await Cotizacion.findAll({
        where,
        include: INCLUDES_COTIZACION,
        order: [['id_cotizacion', 'ASC']]
      });

      return res.status(200).json({
        status: 'success',
        total: cotizaciones.length,
        data: cotizaciones
      });
    } catch (err) {
      console.error('Error al listar cotizaciones:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al consultar cotizaciones.'
      });
    }
  },

  async obtenerCotizacion(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El parámetro ID debe ser un número entero positivo válido.'
        });
      }

      const cotizacion = await Cotizacion.findByPk(id, {
        include: INCLUDES_COTIZACION
      });

      if (!cotizacion) {
        return res.status(404).json({
          status: 'error',
          message: `Cotización con ID ${id} no encontrada.`
        });
      }

      return res.status(200).json({
        status: 'success',
        data: cotizacion
      });
    } catch (err) {
      console.error('Error al obtener cotización por ID:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al obtener la cotización.'
      });
    }
  },

  async crearCotizacion(req, res) {
    try {
      const errorValidacion = validateCotizacionPayload(req.body, false);
      if (errorValidacion) {
        return res.status(400).json({
          status: 'error',
          message: errorValidacion
        });
      }

      const {
        id_oportunidad,
        id_empleado,
        numero_cotizacion,
        version,
        fecha_emision,
        fecha_vencimiento,
        subtotal,
        total,
        estado
      } = req.body;

      // Verificar existencia de OportunidadComercial
      const oportunidad = await OportunidadComercial.findByPk(id_oportunidad);
      if (!oportunidad) {
        return res.status(404).json({
          status: 'error',
          message: `La oportunidad comercial con ID ${id_oportunidad} no existe.`
        });
      }

      // Verificar existencia de Empleado
      const empleado = await Empleado.findByPk(id_empleado);
      if (!empleado) {
        return res.status(404).json({
          status: 'error',
          message: `El empleado con ID ${id_empleado} no existe.`
        });
      }

      // Verificar unicidad de numero_cotizacion
      const numTrim = numero_cotizacion.trim();
      const existente = await Cotizacion.findOne({
        where: { numero_cotizacion: numTrim }
      });
      if (existente) {
        return res.status(409).json({
          status: 'error',
          message: `El número de cotización '${numTrim}' ya está registrado.`
        });
      }

      const nuevaCotizacion = await Cotizacion.create({
        id_oportunidad,
        id_empleado,
        numero_cotizacion: numTrim,
        version: version !== undefined ? version : 1,
        fecha_emision: fecha_emision.trim(),
        fecha_vencimiento: fecha_vencimiento.trim(),
        subtotal,
        total,
        estado: estado ? estado.trim() : 'Borrador'
      });

      const cotizacionConAsociaciones = await Cotizacion.findByPk(nuevaCotizacion.id_cotizacion, {
        include: INCLUDES_COTIZACION
      });

      return res.status(201).json({
        status: 'success',
        message: 'Cotización creada exitosamente.',
        data: cotizacionConAsociaciones
      });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          status: 'error',
          message: 'El número de cotización ya está registrado.'
        });
      }
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join('. ')
        });
      }
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(404).json({
          status: 'error',
          message: 'Violación de clave foránea: verifique que la oportunidad y el empleado existan.'
        });
      }

      console.error('Error al crear cotización:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al crear la cotización.'
      });
    }
  },

  async actualizarCotizacion(req, res) {
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

      const errorValidacion = validateCotizacionPayload(req.body, true);
      if (errorValidacion) {
        return res.status(400).json({
          status: 'error',
          message: errorValidacion
        });
      }

      const cotizacion = await Cotizacion.findByPk(id);
      if (!cotizacion) {
        return res.status(404).json({
          status: 'error',
          message: `Cotización con ID ${id} no encontrada.`
        });
      }

      const {
        id_oportunidad,
        id_empleado,
        numero_cotizacion,
        version,
        fecha_emision,
        fecha_vencimiento,
        subtotal,
        total,
        estado
      } = req.body;

      if (id_oportunidad !== undefined) {
        const oportunidad = await OportunidadComercial.findByPk(id_oportunidad);
        if (!oportunidad) {
          return res.status(404).json({
            status: 'error',
            message: `La oportunidad comercial con ID ${id_oportunidad} no existe.`
          });
        }
        cotizacion.id_oportunidad = id_oportunidad;
      }

      if (id_empleado !== undefined) {
        const empleado = await Empleado.findByPk(id_empleado);
        if (!empleado) {
          return res.status(404).json({
            status: 'error',
            message: `El empleado con ID ${id_empleado} no existe.`
          });
        }
        cotizacion.id_empleado = id_empleado;
      }

      if (numero_cotizacion !== undefined) {
        const numTrim = numero_cotizacion.trim();
        const existente = await Cotizacion.findOne({
          where: {
            numero_cotizacion: numTrim,
            id_cotizacion: { [Op.ne]: id }
          }
        });
        if (existente) {
          return res.status(409).json({
            status: 'error',
            message: `El número de cotización '${numTrim}' ya está registrado.`
          });
        }
        cotizacion.numero_cotizacion = numTrim;
      }

      // Comprobar coherencia de fechas contra el estado actual o nuevo
      const effectiveFechaEmision = fecha_emision !== undefined ? fecha_emision.trim() : cotizacion.fecha_emision;
      const effectiveFechaVencimiento = fecha_vencimiento !== undefined ? fecha_vencimiento.trim() : cotizacion.fecha_vencimiento;

      if (effectiveFechaEmision && effectiveFechaVencimiento) {
        if (effectiveFechaVencimiento < effectiveFechaEmision) {
          return res.status(400).json({
            status: 'error',
            message: 'La fecha de vencimiento (fecha_vencimiento) no puede ser anterior a la fecha de emisión (fecha_emision).'
          });
        }
      }

      if (fecha_emision !== undefined) {
        cotizacion.fecha_emision = effectiveFechaEmision;
      }

      if (fecha_vencimiento !== undefined) {
        cotizacion.fecha_vencimiento = effectiveFechaVencimiento;
      }

      if (version !== undefined) {
        cotizacion.version = version;
      }

      if (subtotal !== undefined) {
        cotizacion.subtotal = subtotal;
      }

      if (total !== undefined) {
        cotizacion.total = total;
      }

      if (estado !== undefined) {
        cotizacion.estado = estado.trim();
      }

      await cotizacion.save();

      const cotizacionActualizada = await Cotizacion.findByPk(id, {
        include: INCLUDES_COTIZACION
      });

      return res.status(200).json({
        status: 'success',
        message: 'Cotización actualizada exitosamente.',
        data: cotizacionActualizada
      });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          status: 'error',
          message: 'El número de cotización ya está registrado.'
        });
      }
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join('. ')
        });
      }
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(404).json({
          status: 'error',
          message: 'Violación de clave foránea: verifique que la oportunidad y el empleado existan.'
        });
      }

      console.error('Error al actualizar cotización:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al actualizar la cotización.'
      });
    }
  },

  async eliminarCotizacion(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El parámetro ID debe ser un número entero positivo válido.'
        });
      }

      const cotizacion = await Cotizacion.findByPk(id);
      if (!cotizacion) {
        return res.status(404).json({
          status: 'error',
          message: `Cotización con ID ${id} no encontrada.`
        });
      }

      // MySQL aplica:
      // 1. DetalleCotizacion: ON DELETE CASCADE
      // 2. Contrato: ON DELETE SET NULL
      await cotizacion.destroy();

      return res.status(200).json({
        status: 'success',
        message: 'Cotización eliminada exitosamente.'
      });
    } catch (err) {
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(409).json({
          status: 'error',
          error: 'Conflicto de integridad referencial',
          message: 'No se puede eliminar la cotización porque está referenciada por otros registros con restricción.'
        });
      }

      console.error('Error al eliminar cotización:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al eliminar la cotización.'
      });
    }
  }
};

module.exports = cotizacionController;

