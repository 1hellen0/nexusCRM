Project NexusCRM {
  database_type: 'MySQL'
  Note: 'Sistema de Gestion Comercial B2B - 18 entidades'
}

// ======================================================
// ENUMERACIONES
// ======================================================

Enum estado_empresa {
  Prospecto
  Activo
  Inactivo
}

Enum etapa_oportunidad {
  Nueva
  Contactada
  Propuesta
  Negociacion
  Ganada
  Perdida
}

Enum tipo_actividad {
  Llamada
  Reunion
  Correo
  Otro
}

Enum estado_actividad {
  Pendiente
  Completada
  Cancelada
}

Enum tipo_direccion {
  Fiscal
  Operativa
  Entrega
  Matriz
}

Enum tipo_producto {
  Producto
  Servicio
}

Enum tipo_campana {
  Email
  Webinar
  Feria
  Digital
  Directa
}

Enum estado_campana {
  Planificada
  Activa
  Finalizada
  Cancelada
}

Enum estado_cotizacion {
  Borrador
  Enviada
  Aprobada
  Rechazada
  Vencida
}

Enum estado_contrato {
  Borrador
  Vigente
  Renovado
  Finalizado
  Cancelado
}

Enum estado_factura {
  Emitida
  Pagada_Parcial
  Pagada_Total
  Anulada
  Vencida
}

Enum metodo_pago {
  Transferencia
  Tarjeta
  Cheque
  Efectivo
}

Enum estado_pago {
  Pendiente
  Confirmado
  Rechazado
}

// ======================================================
// 1. USUARIO
// ======================================================

Table Usuario {
  id_usuario int [pk, increment]
  nombre varchar(120) [not null]
  correo varchar(150) [not null, unique]
  password_hash varchar(255) [not null]
  fecha_creacion datetime [not null, default: `CURRENT_TIMESTAMP`]
}

// ======================================================
// 2. EMPRESA CLIENTE
// ======================================================

Table EmpresaCliente {
  id_empresa int [pk, increment]
  id_sector int [null]
  nombre varchar(150) [not null]
  sector varchar(100) [not null]
  correo varchar(150)
  telefono varchar(20)
  estado estado_empresa [not null, default: 'Prospecto']
  fecha_registro datetime [not null, default: `CURRENT_TIMESTAMP`]
}

// ======================================================
// 3. CONTACTO
// ======================================================

Table Contacto {
  id_contacto int [pk, increment]
  id_empresa int [not null]
  nombre varchar(120) [not null]
  cargo varchar(100)
  correo varchar(150) [not null]
  telefono varchar(20)
  fecha_registro datetime [not null, default: `CURRENT_TIMESTAMP`]

  indexes {
    (id_contacto, id_empresa) [unique, name: 'uq_contacto_empresa']
    id_empresa [name: 'idx_contacto_id_empresa']
  }
}

// ======================================================
// 4. OPORTUNIDAD COMERCIAL
// ======================================================

Table OportunidadComercial {
  id_oportunidad int [pk, increment]
  id_empresa int [not null]
  id_contacto int [not null]
  id_campana int [null]
  titulo varchar(150) [not null]
  descripcion text
  valor_estimado decimal(12,2) [not null]
  etapa etapa_oportunidad [not null, default: 'Nueva']
  fecha_creacion datetime [not null, default: `CURRENT_TIMESTAMP`]
  fecha_cierre_estimada date

  indexes {
    (id_contacto, id_empresa) [name: 'idx_oportunidad_contacto_empresa']
  }
}

// ======================================================
// 5. ACTIVIDAD DE SEGUIMIENTO
// ======================================================

Table ActividadSeguimiento {
  id_actividad int [pk, increment]
  id_oportunidad int [not null]
  tipo tipo_actividad [not null]
  descripcion text [not null]
  fecha_actividad datetime [not null]
  estado estado_actividad [not null, default: 'Pendiente']

  indexes {
    id_oportunidad [name: 'idx_actividad_id_oportunidad']
  }
}

// ======================================================
// 6. SECTOR EMPRESARIAL
// ======================================================

Table SectorEmpresarial {
  id_sector int [pk, increment]
  nombre varchar(80) [not null, unique]
  descripcion varchar(255)
  activo boolean [not null, default: true]
}

// ======================================================
// 7. DIRECCION EMPRESA
// ======================================================

Table DireccionEmpresa {
  id_direccion int [pk, increment]
  id_empresa int [not null]
  tipo tipo_direccion [not null, default: 'Fiscal']
  calle varchar(200) [not null]
  ciudad varchar(100) [not null]
  estado_provincia varchar(100) [not null]
  codigo_postal varchar(20)
  pais varchar(80) [not null]
}

// ======================================================
// 8. DEPARTAMENTO
// ======================================================

Table Departamento {
  id_departamento int [pk, increment]
  codigo varchar(20) [not null, unique]
  nombre varchar(80) [not null, unique]
  activo boolean [not null, default: true]
}

// ======================================================
// 9. EMPLEADO
// ======================================================

Table Empleado {
  id_empleado int [pk, increment]
  id_departamento int [not null]
  id_usuario int [unique]
  nombre varchar(80) [not null]
  apellido varchar(80) [not null]
  correo varchar(150) [not null, unique]
  telefono varchar(20)
  cargo varchar(100) [not null]
  activo boolean [not null, default: true]
}

// ======================================================
// 10. CATEGORIA PRODUCTO
// ======================================================

Table CategoriaProducto {
  id_categoria int [pk, increment]
  nombre varchar(80) [not null, unique]
  descripcion varchar(255)
  activo boolean [not null, default: true]
}

// ======================================================
// 11. PRODUCTO SERVICIO
// ======================================================

Table ProductoServicio {
  id_producto int [pk, increment]
  id_categoria int [not null]
  codigo_sku varchar(50) [not null, unique]
  nombre varchar(150) [not null]
  tipo tipo_producto [not null]
  precio_unitario decimal(12,2) [not null]
  moneda varchar(3) [not null, default: 'USD']
  activo boolean [not null, default: true]
}

// ======================================================
// 12. CAMPANA MARKETING
// ======================================================

Table "CampañaMarketing" {
  id_campana int [pk, increment]
  id_empleado_responsable int [not null]
  nombre varchar(120) [not null]
  tipo tipo_campana [not null]
  presupuesto decimal(12,2) [not null, default: 0.00]
  fecha_inicio date [not null]
  fecha_fin date
  estado estado_campana [not null, default: 'Planificada']
}

// ======================================================
// 13. COTIZACION
// ======================================================

Table Cotizacion {
  id_cotizacion int [pk, increment]
  id_oportunidad int [not null]
  id_empleado int [not null]
  numero_cotizacion varchar(40) [not null, unique]
  version int [not null, default: 1]
  fecha_emision date [not null]
  fecha_vencimiento date [not null]
  subtotal decimal(12,2) [not null]
  total decimal(12,2) [not null]
  estado estado_cotizacion [not null, default: 'Borrador']
}

// ======================================================
// 14. DETALLE COTIZACION
// ======================================================

Table DetalleCotizacion {
  id_detalle_cotizacion int [pk, increment]
  id_cotizacion int [not null]
  id_producto int [not null]
  cantidad decimal(10,2) [not null]
  precio_unitario_pactado decimal(12,2) [not null]
  descuento_porcentaje decimal(5,2) [not null, default: 0.00]
  subtotal_linea decimal(12,2) [not null]
}

// ======================================================
// 15. CONTRATO
// ======================================================

Table Contrato {
  id_contrato int [pk, increment]
  id_empresa int [not null]
  id_cotizacion int [unique]
  id_empleado_aprobador int [not null]
  numero_contrato varchar(40) [not null, unique]
  fecha_inicio date [not null]
  fecha_fin date
  monto_acordado decimal(12,2) [not null]
  estado estado_contrato [not null, default: 'Borrador']
}

// ======================================================
// 16. FACTURA - NUEVA
// ======================================================

Table Factura {
  id_factura int [pk, increment]
  id_empresa int [not null]
  id_contrato int [null]
  numero_factura varchar(40) [not null, unique]
  fecha_emision date [not null]
  fecha_vencimiento date [not null]
  subtotal decimal(12,2) [not null]
  impuestos decimal(12,2) [not null, default: 0.00]
  total decimal(12,2) [not null]
  estado estado_factura [not null, default: 'Emitida']

  Note: 'Facturas emitidas a empresas clientes'
}

// ======================================================
// 17. DETALLE FACTURA - NUEVA
// ======================================================

Table DetalleFactura {
  id_detalle_factura int [pk, increment]
  id_factura int [not null]
  id_producto int [not null]
  cantidad decimal(10,2) [not null]
  precio_unitario decimal(12,2) [not null]
  subtotal_linea decimal(12,2) [not null]

  Note: 'Productos y servicios incluidos en facturas'
}

// ======================================================
// 18. PAGO - NUEVA
// ======================================================

Table Pago {
  id_pago int [pk, increment]
  id_factura int [not null]
  numero_operacion varchar(60) [not null, unique]
  fecha_pago datetime [not null]
  monto decimal(12,2) [not null]
  metodo_pago metodo_pago [not null]
  estado estado_pago [not null, default: 'Confirmado']

  Note: 'Pagos realizados a facturas'
}

// ======================================================
// RELACIONES ORIGINALES
// ======================================================

Ref: Contacto.id_empresa > EmpresaCliente.id_empresa [delete: restrict, update: cascade]

Ref: OportunidadComercial.(id_contacto, id_empresa) > Contacto.(id_contacto, id_empresa) [delete: restrict, update: cascade]

Ref: ActividadSeguimiento.id_oportunidad > OportunidadComercial.id_oportunidad [delete: restrict, update: cascade]

// ======================================================
// RELACIONES: ORGANIZACION Y EMPRESAS
// ======================================================

Ref: EmpresaCliente.id_sector >? SectorEmpresarial.id_sector [delete: set null, update: cascade]

Ref: DireccionEmpresa.id_empresa > EmpresaCliente.id_empresa [delete: restrict, update: cascade]

Ref: Empleado.id_departamento > Departamento.id_departamento [delete: restrict, update: cascade]

Ref: Empleado.id_usuario - Usuario.id_usuario [delete: set null, update: cascade]

// ======================================================
// RELACIONES: PRODUCTOS Y MARKETING
// ======================================================

Ref: ProductoServicio.id_categoria > CategoriaProducto.id_categoria [delete: restrict, update: cascade]

Ref: "CampañaMarketing".id_empleado_responsable > Empleado.id_empleado [delete: restrict, update: cascade]

Ref: OportunidadComercial.id_campana >? "CampañaMarketing".id_campana [delete: set null, update: cascade]

// ======================================================
// RELACIONES: COTIZACIONES Y CONTRATOS
// ======================================================

Ref: Cotizacion.id_oportunidad > OportunidadComercial.id_oportunidad [delete: restrict, update: cascade]

Ref: Cotizacion.id_empleado > Empleado.id_empleado [delete: restrict, update: cascade]

Ref: DetalleCotizacion.id_cotizacion > Cotizacion.id_cotizacion [delete: cascade, update: cascade]

Ref: DetalleCotizacion.id_producto > ProductoServicio.id_producto [delete: restrict, update: cascade]

Ref: Contrato.id_empresa > EmpresaCliente.id_empresa [delete: restrict, update: cascade]

Ref: Contrato.id_cotizacion - Cotizacion.id_cotizacion [delete: set null, update: cascade]

Ref: Contrato.id_empleado_aprobador > Empleado.id_empleado [delete: restrict, update: cascade]

// ======================================================
// RELACIONES NUEVAS: FACTURACION Y PAGOS
// ======================================================

// Una empresa puede tener varias facturas
Ref: Factura.id_empresa > EmpresaCliente.id_empresa [delete: restrict, update: cascade]

// Una factura puede estar asociada a un contrato
Ref: Factura.id_contrato >? Contrato.id_contrato [delete: set null, update: cascade]

// Una factura tiene varios detalles
Ref: DetalleFactura.id_factura > Factura.id_factura [delete: cascade, update: cascade]

// Un producto puede aparecer en varias facturas
Ref: DetalleFactura.id_producto > ProductoServicio.id_producto [delete: restrict, update: cascade]

// Una factura puede recibir varios pagos
Ref: Pago.id_factura > Factura.id_factura [delete: restrict, update: cascade]
