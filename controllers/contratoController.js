'use strict';

const {
  Contrato,
  EmpresaCliente,
  Cotizacion,
  Empleado,
  Departamento,
  Usuario,
  Factura,
  Sequelize
} = require('../models');
const { Op } = Sequelize;

const ALLOWED_FIELDS = [
  'id_empresa',
  'id_cotizacion',
  'id_empleado_aprobador',
  'numero_contrato',
  'fecha_inicio',
  'fecha_fin',
  'monto_acordado',
  'estado'
];
const PROTECTED_FIELDS = ['id_contrato'];
const ESTADOS_PERMITIDOS = ['Borrador', 'Vigente', 'Renovado', 'Finalizado', 'Cancelado'];

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

function validateMontoAcordado(val) {
  if (val === undefined || val === null || val === '') {
    return 'El campo monto_acordado es obligatorio.';
  }
  if (typeof val !== 'number' && typeof val !== 'string') {
    return 'El campo monto_acordado debe ser un valor numérico o cadena numérica válida.';
  }
  const str = String(val).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    return 'El campo monto_acordado debe ser un número decimal válido mayor o igual a 0 con máximo 2 decimales.';
  }
  const parts = str.split('.');
  if (parts[0].length > 10) {
    return 'El campo monto_acordado excede el límite permitido para DECIMAL(12,2) (máximo 10 dígitos enteros).';
  }
  const num = parseFloat(str);
  if (isNaN(num) || num < 0) {
    return 'El campo monto_acordado no puede ser negativo.';
  }
  return null;
}

function validateContratoPayload(data, isUpdate = false) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'El cuerpo de la solicitud debe ser un objeto JSON válido.';
  }

  const disallowed = checkDisallowedFields(data);
  if (disallowed) return disallowed;

  if (!isUpdate) {
    if (data.id_empresa === undefined || data.id_empresa === null) {
      return 'El campo id_empresa es obligatorio.';
    }
    if (data.id_empleado_aprobador === undefined || data.id_empleado_aprobador === null) {
      return 'El campo id_empleado_aprobador es obligatorio.';
    }
    if (!data.numero_contrato || typeof data.numero_contrato !== 'string' || data.numero_contrato.trim() === '') {
      return 'El campo numero_contrato es obligatorio.';
    }
    if (!data.fecha_inicio || typeof data.fecha_inicio !== 'string' || data.fecha_inicio.trim() === '') {
      return 'El campo fecha_inicio es obligatorio.';
    }
    if (data.monto_acordado === undefined || data.monto_acordado === null || data.monto_acordado === '') {
      return 'El campo monto_acordado es obligatorio.';
    }
  }

  if (data.id_empresa !== undefined) {
    const idEmpresaNum = validateId(data.id_empresa);
    if (!idEmpresaNum) {
      return 'El campo id_empresa debe ser un número entero positivo.';
    }
  }

  if (data.id_cotizacion !== undefined && data.id_cotizacion !== null && data.id_cotizacion !== '') {
    const idCotNum = validateId(data.id_cotizacion);
    if (!idCotNum) {
      return 'El campo id_cotizacion debe ser un número entero positivo o null.';
    }
  }

  if (data.id_empleado_aprobador !== undefined) {
    const idAprobadorNum = validateId(data.id_empleado_aprobador);
    if (!idAprobadorNum) {
      return 'El campo id_empleado_aprobador debe ser un número entero positivo.';
    }
  }

  if (data.numero_contrato !== undefined) {
    if (typeof data.numero_contrato !== 'string' || data.numero_contrato.trim() === '') {
      return 'El numero_contrato no puede estar vacío.';
    }
    if (data.numero_contrato.trim().length > 40) {
      return 'El numero_contrato no puede superar los 40 caracteres.';
    }
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

  if (data.fecha_inicio && data.fecha_fin) {
    const fInicio = data.fecha_inicio.trim();
    const fFin = data.fecha_fin.trim();
    if (fFin < fInicio) {
      return 'La fecha de fin (fecha_fin) no puede ser anterior a la fecha de inicio (fecha_inicio).';
    }
  }

  if (data.monto_acordado !== undefined) {
    const errMonto = validateMontoAcordado(data.monto_acordado);
    if (errMonto) return errMonto;
  }

  if (data.estado !== undefined) {
    if (typeof data.estado !== 'string' || !ESTADOS_PERMITIDOS.includes(data.estado.trim())) {
      return `El campo estado debe ser uno de los siguientes valores permitidos: ${ESTADOS_PERMITIDOS.join(', ')}.`;
    }
  }

  return null;
}

const INCLUDES_CONTRATO = [
  {
    model: EmpresaCliente,
    as: 'empresa',
    attributes: ['id_empresa', 'id_sector', 'nombre', 'sector', 'correo', 'telefono', 'estado']
  },
  {
    model: Cotizacion,
    as: 'cotizacion',
    attributes: ['id_cotizacion', 'id_oportunidad', 'id_empleado', 'numero_cotizacion', 'version', 'total', 'estado']
  },
  {
    model: Empleado,
    as: 'aprobador',
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
    model: Factura,
    as: 'facturas',
    attributes: [
      'id_factura',
      'id_empresa',
      'id_contrato',
      'numero_factura',
      'fecha_emision',
      'fecha_vencimiento',
      'total',
      'estado'
    ]
  }
];

const contratoController = {
  async listarContratos(req, res) {
    try {
      const where = {};

      if (req.query.estado !== undefined && typeof req.query.estado === 'string') {
        const estadoTrim = req.query.estado.trim();
        if (ESTADOS_PERMITIDOS.includes(estadoTrim)) {
          where.estado = estadoTrim;
        }
      }

      if (req.query.id_empresa !== undefined) {
        const idEmpresa = validateId(req.query.id_empresa);
        if (idEmpresa) {
          where.id_empresa = idEmpresa;
        }
      }

      if (req.query.id_empleado_aprobador !== undefined) {
        const idAprob = validateId(req.query.id_empleado_aprobador);
        if (idAprob) {
          where.id_empleado_aprobador = idAprob;
        }
      }

      if (req.query.id_cotizacion !== undefined) {
        const idCot = validateId(req.query.id_cotizacion);
        if (idCot) {
          where.id_cotizacion = idCot;
        }
      }

      const contratos = await Contrato.findAll({
        where,
        include: INCLUDES_CONTRATO,
        order: [['id_contrato', 'ASC']]
      });

      return res.status(200).json({
        status: 'success',
        total: contratos.length,
        data: contratos
      });
    } catch (err) {
      console.error('Error al listar contratos:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al consultar contratos.'
      });
    }
  },

  async obtenerContrato(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El parámetro ID debe ser un número entero positivo válido.'
        });
      }

      const contrato = await Contrato.findByPk(id, {
        include: INCLUDES_CONTRATO
      });

      if (!contrato) {
        return res.status(404).json({
          status: 'error',
          message: `Contrato con ID ${id} no encontrado.`
        });
      }

      return res.status(200).json({
        status: 'success',
        data: contrato
      });
    } catch (err) {
      console.error('Error al obtener contrato por ID:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al obtener el contrato.'
      });
    }
  },

  async crearContrato(req, res) {
    try {
      const errorValidacion = validateContratoPayload(req.body, false);
      if (errorValidacion) {
        return res.status(400).json({
          status: 'error',
          message: errorValidacion
        });
      }

      const {
        id_empresa,
        id_cotizacion,
        id_empleado_aprobador,
        numero_contrato,
        fecha_inicio,
        fecha_fin,
        monto_acordado,
        estado
      } = req.body;

      // Verificar existencia de EmpresaCliente
      const empresa = await EmpresaCliente.findByPk(id_empresa);
      if (!empresa) {
        return res.status(404).json({
          status: 'error',
          message: `La empresa cliente con ID ${id_empresa} no existe.`
        });
      }

      // Verificar existencia de Empleado aprobador
      const empleado = await Empleado.findByPk(id_empleado_aprobador);
      if (!empleado) {
        return res.status(404).json({
          status: 'error',
          message: `El empleado aprobador con ID ${id_empleado_aprobador} no existe.`
        });
      }

      // Si se proporciona id_cotizacion, verificar existencia y unicidad
      const idCotizacionFinal = id_cotizacion !== undefined && id_cotizacion !== null && id_cotizacion !== ''
        ? validateId(id_cotizacion)
        : null;

      if (idCotizacionFinal !== null) {
        const cotizacion = await Cotizacion.findByPk(idCotizacionFinal);
        if (!cotizacion) {
          return res.status(404).json({
            status: 'error',
            message: `La cotización con ID ${idCotizacionFinal} no existe.`
          });
        }

        const contratoExistenteConCotizacion = await Contrato.findOne({
          where: { id_cotizacion: idCotizacionFinal }
        });
        if (contratoExistenteConCotizacion) {
          return res.status(409).json({
            status: 'error',
            message: `La cotización con ID ${idCotizacionFinal} ya está vinculada a otro contrato.`
          });
        }
      }

      // Verificar unicidad de numero_contrato
      const numTrim = numero_contrato.trim();
      const contratoExistenteConNumero = await Contrato.findOne({
        where: { numero_contrato: numTrim }
      });
      if (contratoExistenteConNumero) {
        return res.status(409).json({
          status: 'error',
          message: `El número de contrato '${numTrim}' ya está registrado.`
        });
      }

      const nuevoContrato = await Contrato.create({
        id_empresa,
        id_cotizacion: idCotizacionFinal,
        id_empleado_aprobador,
        numero_contrato: numTrim,
        fecha_inicio: fecha_inicio.trim(),
        fecha_fin: fecha_fin && fecha_fin.trim() !== '' ? fecha_fin.trim() : null,
        monto_acordado,
        estado: estado ? estado.trim() : 'Borrador'
      });

      const contratoConAsociaciones = await Contrato.findByPk(nuevoContrato.id_contrato, {
        include: INCLUDES_CONTRATO
      });

      return res.status(201).json({
        status: 'success',
        message: 'Contrato creado exitosamente.',
        data: contratoConAsociaciones
      });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        const campo = err.errors && err.errors[0] ? err.errors[0].path : 'campo único';
        return res.status(409).json({
          status: 'error',
          message: `Violación de restricción de unicidad en '${campo}'.`
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
          message: 'Violación de clave foránea: verifique que la empresa, el empleado y la cotización existan.'
        });
      }

      console.error('Error al crear contrato:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al crear el contrato.'
      });
    }
  },

  async actualizarContrato(req, res) {
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

      const errorValidacion = validateContratoPayload(req.body, true);
      if (errorValidacion) {
        return res.status(400).json({
          status: 'error',
          message: errorValidacion
        });
      }

      const contrato = await Contrato.findByPk(id);
      if (!contrato) {
        return res.status(404).json({
          status: 'error',
          message: `Contrato con ID ${id} no encontrado.`
        });
      }

      const {
        id_empresa,
        id_cotizacion,
        id_empleado_aprobador,
        numero_contrato,
        fecha_inicio,
        fecha_fin,
        monto_acordado,
        estado
      } = req.body;

      if (id_empresa !== undefined) {
        const empresa = await EmpresaCliente.findByPk(id_empresa);
        if (!empresa) {
          return res.status(404).json({
            status: 'error',
            message: `La empresa cliente con ID ${id_empresa} no existe.`
          });
        }
        contrato.id_empresa = id_empresa;
      }

      if (id_empleado_aprobador !== undefined) {
        const empleado = await Empleado.findByPk(id_empleado_aprobador);
        if (!empleado) {
          return res.status(404).json({
            status: 'error',
            message: `El empleado aprobador con ID ${id_empleado_aprobador} no existe.`
          });
        }
        contrato.id_empleado_aprobador = id_empleado_aprobador;
      }

      if (id_cotizacion !== undefined) {
        if (id_cotizacion === null || id_cotizacion === '') {
          contrato.id_cotizacion = null;
        } else {
          const idCotNum = validateId(id_cotizacion);
          const cotizacion = await Cotizacion.findByPk(idCotNum);
          if (!cotizacion) {
            return res.status(404).json({
              status: 'error',
              message: `La cotización con ID ${idCotNum} no existe.`
            });
          }

          const contratoExistenteConCotizacion = await Contrato.findOne({
            where: {
              id_cotizacion: idCotNum,
              id_contrato: { [Op.ne]: id }
            }
          });
          if (contratoExistenteConCotizacion) {
            return res.status(409).json({
              status: 'error',
              message: `La cotización con ID ${idCotNum} ya está vinculada a otro contrato.`
            });
          }
          contrato.id_cotizacion = idCotNum;
        }
      }

      if (numero_contrato !== undefined) {
        const numTrim = numero_contrato.trim();
        const contratoExistenteConNumero = await Contrato.findOne({
          where: {
            numero_contrato: numTrim,
            id_contrato: { [Op.ne]: id }
          }
        });
        if (contratoExistenteConNumero) {
          return res.status(409).json({
            status: 'error',
            message: `El número de contrato '${numTrim}' ya está registrado.`
          });
        }
        contrato.numero_contrato = numTrim;
      }

      // Comprobar coherencia de fechas contra el estado actual o nuevo
      const effectiveFechaInicio = fecha_inicio !== undefined ? fecha_inicio.trim() : contrato.fecha_inicio;
      const effectiveFechaFin = fecha_fin !== undefined
        ? (fecha_fin && fecha_fin.trim() !== '' ? fecha_fin.trim() : null)
        : contrato.fecha_fin;

      if (effectiveFechaInicio && effectiveFechaFin) {
        if (effectiveFechaFin < effectiveFechaInicio) {
          return res.status(400).json({
            status: 'error',
            message: 'La fecha de fin (fecha_fin) no puede ser anterior a la fecha de inicio (fecha_inicio).'
          });
        }
      }

      if (fecha_inicio !== undefined) {
        contrato.fecha_inicio = effectiveFechaInicio;
      }

      if (fecha_fin !== undefined) {
        contrato.fecha_fin = effectiveFechaFin;
      }

      if (monto_acordado !== undefined) {
        contrato.monto_acordado = monto_acordado;
      }

      if (estado !== undefined) {
        contrato.estado = estado.trim();
      }

      await contrato.save();

      const contratoActualizado = await Contrato.findByPk(id, {
        include: INCLUDES_CONTRATO
      });

      return res.status(200).json({
        status: 'success',
        message: 'Contrato actualizado exitosamente.',
        data: contratoActualizado
      });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        const campo = err.errors && err.errors[0] ? err.errors[0].path : 'campo único';
        return res.status(409).json({
          status: 'error',
          message: `Violación de restricción de unicidad en '${campo}'.`
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
          message: 'Violación de clave foránea: verifique que la empresa, el empleado y la cotización existan.'
        });
      }

      console.error('Error al actualizar contrato:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al actualizar el contrato.'
      });
    }
  },

  async eliminarContrato(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El parámetro ID debe ser un número entero positivo válido.'
        });
      }

      const contrato = await Contrato.findByPk(id);
      if (!contrato) {
        return res.status(404).json({
          status: 'error',
          message: `Contrato con ID ${id} no encontrado.`
        });
      }

      // MySQL aplica ON DELETE SET NULL en Factura.id_contrato
      await contrato.destroy();

      return res.status(200).json({
        status: 'success',
        message: 'Contrato eliminado exitosamente.'
      });
    } catch (err) {
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(409).json({
          status: 'error',
          error: 'Conflicto de integridad referencial',
          message: 'No se puede eliminar el contrato debido a restricciones de clave foránea.'
        });
      }

      console.error('Error al eliminar contrato:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al eliminar el contrato.'
      });
    }
  }
};

module.exports = contratoController;

