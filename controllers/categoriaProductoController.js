'use strict';

const { CategoriaProducto, ProductoServicio, Sequelize } = require('../models');

const ALLOWED_FIELDS = ['nombre', 'descripcion', 'activo'];
const PROTECTED_FIELDS = ['id_categoria'];

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

function validateCategoriaPayload(data, isUpdate = false) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'El cuerpo de la solicitud debe ser un objeto JSON válido.';
  }

  const disallowed = checkDisallowedFields(data);
  if (disallowed) return disallowed;

  if (!isUpdate) {
    if (!data.nombre || typeof data.nombre !== 'string' || data.nombre.trim() === '') {
      return 'El campo nombre es obligatorio.';
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

  if (data.descripcion !== undefined && data.descripcion !== null && data.descripcion !== '') {
    if (typeof data.descripcion !== 'string') {
      return 'La descripción debe ser una cadena de texto.';
    }
    if (data.descripcion.length > 255) {
      return 'La descripción no puede superar los 255 caracteres.';
    }
  }

  if (data.activo !== undefined && typeof data.activo !== 'boolean') {
    return 'El campo activo debe ser un valor booleano (true o false).';
  }

  return null;
}

const categoriaProductoController = {
  async listarCategorias(req, res) {
    try {
      const where = {};
      if (req.query.activo !== undefined) {
        where.activo = req.query.activo === 'true' || req.query.activo === '1';
      }

      const categorias = await CategoriaProducto.findAll({
        where,
        order: [['id_categoria', 'ASC']]
      });

      return res.status(200).json({
        status: 'success',
        total: categorias.length,
        data: categorias
      });
    } catch (err) {
      console.error('Error al listar categorías de productos:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al consultar categorías de productos.'
      });
    }
  },

  async obtenerCategoria(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El identificador debe ser un número entero positivo.'
        });
      }

      const categoria = await CategoriaProducto.findByPk(id, {
        include: [
          {
            model: ProductoServicio,
            as: 'productosServicios',
            attributes: [
              'id_producto',
              'codigo_sku',
              'nombre',
              'tipo',
              'precio_unitario',
              'moneda',
              'activo'
            ]
          }
        ]
      });

      if (!categoria) {
        return res.status(404).json({
          status: 'error',
          message: `Categoría de producto con ID ${id} no encontrada.`
        });
      }

      return res.status(200).json({
        status: 'success',
        data: categoria
      });
    } catch (err) {
      console.error('Error al obtener categoría de producto:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al consultar la categoría de producto.'
      });
    }
  },

  async crearCategoria(req, res) {
    try {
      const validationError = validateCategoriaPayload(req.body, false);
      if (validationError) {
        return res.status(400).json({
          status: 'error',
          message: validationError
        });
      }

      const nombreTrimmed = req.body.nombre.trim();

      // Verificar unicidad de nombre
      const existing = await CategoriaProducto.findOne({
        where: { nombre: nombreTrimmed }
      });
      if (existing) {
        return res.status(409).json({
          status: 'error',
          message: `Ya existe una categoría de producto con el nombre '${nombreTrimmed}'.`
        });
      }

      const payload = {
        nombre: nombreTrimmed,
        descripcion: req.body.descripcion ? req.body.descripcion.trim() : null,
        activo: req.body.activo !== undefined ? req.body.activo : true
      };

      const nuevaCategoria = await CategoriaProducto.create(payload);

      return res.status(201).json({
        status: 'success',
        data: nuevaCategoria
      });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          status: 'error',
          message: 'El nombre de la categoría ya está registrado.'
        });
      }
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join(', ')
        });
      }
      console.error('Error al crear categoría de producto:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al crear la categoría de producto.'
      });
    }
  },

  async actualizarCategoria(req, res) {
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

      const validationError = validateCategoriaPayload(req.body, true);
      if (validationError) {
        return res.status(400).json({
          status: 'error',
          message: validationError
        });
      }

      const categoria = await CategoriaProducto.findByPk(id);
      if (!categoria) {
        return res.status(404).json({
          status: 'error',
          message: `Categoría de producto con ID ${id} no encontrada.`
        });
      }

      // Validar colisión de nombre
      if (req.body.nombre !== undefined) {
        const nombreTrimmed = req.body.nombre.trim();
        const existing = await CategoriaProducto.findOne({
          where: {
            nombre: nombreTrimmed,
            id_categoria: { [Sequelize.Op.ne]: id }
          }
        });
        if (existing) {
          return res.status(409).json({
            status: 'error',
            message: `Ya existe otra categoría de producto con el nombre '${nombreTrimmed}'.`
          });
        }
      }

      const updateData = {};
      if (req.body.nombre !== undefined) updateData.nombre = req.body.nombre.trim();
      if (req.body.descripcion !== undefined) {
        updateData.descripcion = req.body.descripcion ? req.body.descripcion.trim() : null;
      }
      if (req.body.activo !== undefined) updateData.activo = req.body.activo;

      await categoria.update(updateData);

      return res.status(200).json({
        status: 'success',
        data: categoria
      });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          status: 'error',
          message: 'El nombre de la categoría ya está registrado.'
        });
      }
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join(', ')
        });
      }
      console.error('Error al actualizar categoría de producto:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al actualizar la categoría de producto.'
      });
    }
  },

  async eliminarCategoria(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El identificador debe ser un número entero positivo.'
        });
      }

      const categoria = await CategoriaProducto.findByPk(id);
      if (!categoria) {
        return res.status(404).json({
          status: 'error',
          message: `Categoría de producto con ID ${id} no encontrada.`
        });
      }

      // Verificar dependencia previa con ProductoServicio (ON DELETE RESTRICT)
      const countProductos = await ProductoServicio.count({
        where: { id_categoria: id }
      });

      if (countProductos > 0) {
        return res.status(409).json({
          status: 'error',
          message: 'No se puede eliminar la categoría porque tiene productos o servicios asociados.'
        });
      }

      await categoria.destroy();

      return res.status(200).json({
        status: 'success',
        message: 'Categoría de producto eliminada exitosamente.'
      });
    } catch (err) {
      if (
        err.name === 'SequelizeForeignKeyConstraintError' ||
        (err.original && (err.original.code === 'ER_ROW_IS_REFERENCED_2' || err.original.errno === 1451))
      ) {
        return res.status(409).json({
          status: 'error',
          message: 'No se puede eliminar la categoría porque tiene productos o servicios asociados.'
        });
      }

      console.error('Error al eliminar categoría de producto:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al eliminar la categoría de producto.'
      });
    }
  }
};

module.exports = categoriaProductoController;

