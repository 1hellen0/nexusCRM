'use strict';

const {
  DetalleCotizacion,
  Cotizacion,
  ProductoServicio,
  Sequelize
} = require('../models');

const ALLOWED_FIELDS = [
  'id_cotizacion',
  'id_producto',
  'cantidad',
  'precio_unitario_pactado',
  'descuento_porcentaje',
  'subtotal_linea'
];
const PROTECTED_FIELDS = ['id_detalle_cotizacion'];

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

function validateCantidad(val) {
  if (val === undefined || val === null || val === '') {
    return 'El campo cantidad es obligatorio.';
  }
  if (typeof val !== 'number' && typeof val !== 'string') {
    return 'El campo cantidad debe ser un valor numérico o cadena numérica válida.';
  }
  const str = String(val).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    return 'El campo cantidad debe ser un número decimal válido mayor a 0 con máximo 2 decimales.';
  }
  const parts = str.split('.');
  if (parts[0].length > 8) {
    return 'El campo cantidad excede el límite permitido para DECIMAL(10,2) (máximo 8 dígitos enteros).';
  }
  const num = parseFloat(str);
  if (isNaN(num) || num <= 0) {
    return 'El campo cantidad debe ser mayor a 0.';
  }
  return null;
}

function validatePrecioUnitarioPactado(val) {
  if (val === undefined || val === null || val === '') {
    return 'El campo precio_unitario_pactado es obligatorio.';
  }
  if (typeof val !== 'number' && typeof val !== 'string') {
    return 'El campo precio_unitario_pactado debe ser un valor numérico o cadena numérica válida.';
  }
  const str = String(val).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    return 'El campo precio_unitario_pactado debe ser un número decimal válido mayor o igual a 0 con máximo 2 decimales.';
  }
  const parts = str.split('.');
  if (parts[0].length > 10) {
    return 'El campo precio_unitario_pactado excede el límite permitido para DECIMAL(12,2) (máximo 10 dígitos enteros).';
  }
  const num = parseFloat(str);
  if (isNaN(num) || num < 0) {
    return 'El campo precio_unitario_pactado no puede ser negativo.';
  }
  return null;
}

function validateDescuentoPorcentaje(val) {
  if (val === undefined || val === null || val === '') {
    return null;
  }
  if (typeof val !== 'number' && typeof val !== 'string') {
    return 'El campo descuento_porcentaje debe ser un valor numérico o cadena numérica válida.';
  }
  const str = String(val).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    return 'El campo descuento_porcentaje debe ser un número decimal válido entre 0 y 100 con máximo 2 decimales.';
  }
  const num = parseFloat(str);
  if (isNaN(num) || num < 0 || num > 100) {
    return 'El porcentaje de descuento debe estar comprendido entre 0.00 y 100.00.';
  }
  return null;
}

function validateSubtotalLinea(val) {
  if (val === undefined || val === null || val === '') {
    return 'El campo subtotal_linea es obligatorio.';
  }
  if (typeof val !== 'number' && typeof val !== 'string') {
    return 'El campo subtotal_linea debe ser un valor numérico o cadena numérica válida.';
  }
  const str = String(val).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    return 'El campo subtotal_linea debe ser un número decimal válido mayor o igual a 0 con máximo 2 decimales.';
  }
  const parts = str.split('.');
  if (parts[0].length > 10) {
    return 'El campo subtotal_linea excede el límite permitido para DECIMAL(12,2) (máximo 10 dígitos enteros).';
  }
  const num = parseFloat(str);
  if (isNaN(num) || num < 0) {
    return 'El campo subtotal_linea no puede ser negativo.';
  }
  return null;
}

function validateDetalleCotizacionPayload(data, isUpdate = false) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'El cuerpo de la solicitud debe ser un objeto JSON válido.';
  }

  const disallowed = checkDisallowedFields(data);
  if (disallowed) return disallowed;

  if (!isUpdate) {
    if (data.id_cotizacion === undefined || data.id_cotizacion === null) {
      return 'El campo id_cotizacion es obligatorio.';
    }
    if (data.id_producto === undefined || data.id_producto === null) {
      return 'El campo id_producto es obligatorio.';
    }
    if (data.cantidad === undefined || data.cantidad === null || data.cantidad === '') {
      return 'El campo cantidad es obligatorio.';
    }
    if (data.precio_unitario_pactado === undefined || data.precio_unitario_pactado === null || data.precio_unitario_pactado === '') {
      return 'El campo precio_unitario_pactado es obligatorio.';
    }
    if (data.subtotal_linea === undefined || data.subtotal_linea === null || data.subtotal_linea === '') {
      return 'El campo subtotal_linea es obligatorio.';
    }
  }

  if (data.id_cotizacion !== undefined) {
    const idCotNum = validateId(data.id_cotizacion);
    if (!idCotNum) {
      return 'El campo id_cotizacion debe ser un número entero positivo.';
    }
  }

  if (data.id_producto !== undefined) {
    const idProdNum = validateId(data.id_producto);
    if (!idProdNum) {
      return 'El campo id_producto debe ser un número entero positivo.';
    }
  }

  if (data.cantidad !== undefined) {
    const errCant = validateCantidad(data.cantidad);
    if (errCant) return errCant;
  }

  if (data.precio_unitario_pactado !== undefined) {
    const errPrecio = validatePrecioUnitarioPactado(data.precio_unitario_pactado);
    if (errPrecio) return errPrecio;
  }

  if (data.descuento_porcentaje !== undefined) {
    const errDesc = validateDescuentoPorcentaje(data.descuento_porcentaje);
    if (errDesc) return errDesc;
  }

  if (data.subtotal_linea !== undefined) {
    const errSub = validateSubtotalLinea(data.subtotal_linea);
    if (errSub) return errSub;
  }

  return null;
}

const INCLUDES_DETALLE = [
  {
    model: Cotizacion,
    as: 'cotizacion',
    attributes: [
      'id_cotizacion',
      'id_oportunidad',
      'id_empleado',
      'numero_cotizacion',
      'version',
      'fecha_emision',
      'fecha_vencimiento',
      'subtotal',
      'total',
      'estado'
    ]
  },
  {
    model: ProductoServicio,
    as: 'producto',
    attributes: [
      'id_producto',
      'id_categoria',
      'codigo_sku',
      'nombre',
      'tipo',
      'precio_unitario',
      'moneda',
      'activo'
    ]
  }
];

const detalleCotizacionController = {
  async listarDetalles(req, res) {
    try {
      const where = {};

      if (req.query.id_cotizacion !== undefined) {
        const idCot = validateId(req.query.id_cotizacion);
        if (idCot) {
          where.id_cotizacion = idCot;
        }
      }

      if (req.query.id_producto !== undefined) {
        const idProd = validateId(req.query.id_producto);
        if (idProd) {
          where.id_producto = idProd;
        }
      }

      const detalles = await DetalleCotizacion.findAll({
        where,
        include: INCLUDES_DETALLE,
        order: [['id_detalle_cotizacion', 'ASC']]
      });

      return res.status(200).json({
        status: 'success',
        total: detalles.length,
        data: detalles
      });
    } catch (err) {
      console.error('Error al listar detalles de cotización:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al consultar detalles de cotización.'
      });
    }
  },

  async obtenerDetalle(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El parámetro ID debe ser un número entero positivo válido.'
        });
      }

      const detalle = await DetalleCotizacion.findByPk(id, {
        include: INCLUDES_DETALLE
      });

      if (!detalle) {
        return res.status(404).json({
          status: 'error',
          message: `Detalle de cotización con ID ${id} no encontrado.`
        });
      }

      return res.status(200).json({
        status: 'success',
        data: detalle
      });
    } catch (err) {
      console.error('Error al obtener detalle de cotización por ID:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al obtener el detalle de cotización.'
      });
    }
  },

  async crearDetalle(req, res) {
    try {
      const errorValidacion = validateDetalleCotizacionPayload(req.body, false);
      if (errorValidacion) {
        return res.status(400).json({
          status: 'error',
          message: errorValidacion
        });
      }

      const {
        id_cotizacion,
        id_producto,
        cantidad,
        precio_unitario_pactado,
        descuento_porcentaje,
        subtotal_linea
      } = req.body;

      // Verificar existencia de Cotizacion
      const cotizacion = await Cotizacion.findByPk(id_cotizacion);
      if (!cotizacion) {
        return res.status(404).json({
          status: 'error',
          message: `La cotización con ID ${id_cotizacion} no existe.`
        });
      }

      // Verificar existencia de ProductoServicio
      const producto = await ProductoServicio.findByPk(id_producto);
      if (!producto) {
        return res.status(404).json({
          status: 'error',
          message: `El producto o servicio con ID ${id_producto} no existe.`
        });
      }

      const nuevoDetalle = await DetalleCotizacion.create({
        id_cotizacion,
        id_producto,
        cantidad,
        precio_unitario_pactado,
        descuento_porcentaje: descuento_porcentaje !== undefined && descuento_porcentaje !== null && descuento_porcentaje !== ''
          ? descuento_porcentaje
          : 0.00,
        subtotal_linea
      });

      const detalleConAsociaciones = await DetalleCotizacion.findByPk(nuevoDetalle.id_detalle_cotizacion, {
        include: INCLUDES_DETALLE
      });

      return res.status(201).json({
        status: 'success',
        message: 'Detalle de cotización creado exitosamente.',
        data: detalleConAsociaciones
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
          message: 'Violación de clave foránea: verifique que la cotización y el producto existan.'
        });
      }

      console.error('Error al crear detalle de cotización:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al crear detalle de cotización.'
      });
    }
  },

  async actualizarDetalle(req, res) {
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

      const errorValidacion = validateDetalleCotizacionPayload(req.body, true);
      if (errorValidacion) {
        return res.status(400).json({
          status: 'error',
          message: errorValidacion
        });
      }

      const detalle = await DetalleCotizacion.findByPk(id);
      if (!detalle) {
        return res.status(404).json({
          status: 'error',
          message: `Detalle de cotización con ID ${id} no encontrado.`
        });
      }

      const {
        id_cotizacion,
        id_producto,
        cantidad,
        precio_unitario_pactado,
        descuento_porcentaje,
        subtotal_linea
      } = req.body;

      if (id_cotizacion !== undefined) {
        const cotizacion = await Cotizacion.findByPk(id_cotizacion);
        if (!cotizacion) {
          return res.status(404).json({
            status: 'error',
            message: `La cotización con ID ${id_cotizacion} no existe.`
          });
        }
        detalle.id_cotizacion = id_cotizacion;
      }

      if (id_producto !== undefined) {
        const producto = await ProductoServicio.findByPk(id_producto);
        if (!producto) {
          return res.status(404).json({
            status: 'error',
            message: `El producto o servicio con ID ${id_producto} no existe.`
          });
        }
        detalle.id_producto = id_producto;
      }

      if (cantidad !== undefined) {
        detalle.cantidad = cantidad;
      }

      if (precio_unitario_pactado !== undefined) {
        detalle.precio_unitario_pactado = precio_unitario_pactado;
      }

      if (descuento_porcentaje !== undefined) {
        detalle.descuento_porcentaje = descuento_porcentaje;
      }

      if (subtotal_linea !== undefined) {
        detalle.subtotal_linea = subtotal_linea;
      }

      await detalle.save();

      const detalleActualizado = await DetalleCotizacion.findByPk(id, {
        include: INCLUDES_DETALLE
      });

      return res.status(200).json({
        status: 'success',
        message: 'Detalle de cotización actualizado exitosamente.',
        data: detalleActualizado
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
          message: 'Violación de clave foránea: verifique que la cotización y el producto existan.'
        });
      }

      console.error('Error al actualizar detalle de cotización:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al actualizar detalle de cotización.'
      });
    }
  },

  async eliminarDetalle(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El parámetro ID debe ser un número entero positivo válido.'
        });
      }

      const detalle = await DetalleCotizacion.findByPk(id);
      if (!detalle) {
        return res.status(404).json({
          status: 'error',
          message: `Detalle de cotización con ID ${id} no encontrado.`
        });
      }

      await detalle.destroy();

      return res.status(200).json({
        status: 'success',
        message: 'Detalle de cotización eliminado exitosamente.'
      });
    } catch (err) {
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(409).json({
          status: 'error',
          error: 'Conflicto de integridad referencial',
          message: 'No se puede eliminar el detalle de cotización debido a restricciones de clave foránea.'
        });
      }

      console.error('Error al eliminar detalle de cotización:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al eliminar detalle de cotización.'
      });
    }
  }
};

module.exports = detalleCotizacionController;

