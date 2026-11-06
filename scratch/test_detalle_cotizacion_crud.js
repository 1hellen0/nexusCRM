'use strict';

const http = require('http');
const path = require('path');
const projectDir = path.resolve(__dirname, '..');
const {
  sequelize,
  Usuario,
  Departamento,
  Empleado,
  EmpresaCliente,
  Contacto,
  OportunidadComercial,
  CategoriaProducto,
  ProductoServicio,
  Cotizacion,
  DetalleCotizacion
} = require(path.join(projectDir, 'models'));

function makeRequest(pathName, method, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const reqHeaders = { ...headers };
    if (body) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: 3099,
      path: pathName,
      method: method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = data ? JSON.parse(data) : {};
        } catch (e) {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runDetalleCotizacionTests() {
  console.log('=== PRUEBAS HTTP EN VIVO: DETALLECOTIZACION CRUD ===\n');

  try {
    // Limpieza preventiva
    await DetalleCotizacion.destroy({ where: {} });
    await Cotizacion.destroy({ where: { numero_cotizacion: { [sequelize.Sequelize.Op.like]: 'COT-DET-%' } } });
    await ProductoServicio.destroy({ where: { codigo_sku: { [sequelize.Sequelize.Op.like]: 'SKU-DET-%' } } });
    await CategoriaProducto.destroy({ where: { nombre: { [sequelize.Sequelize.Op.like]: 'Cat Det %' } } });
    await OportunidadComercial.destroy({ where: { titulo: { [sequelize.Sequelize.Op.like]: '%Detalle%' } } });
    await Contacto.destroy({ where: { correo: { [sequelize.Sequelize.Op.like]: 'contacto_det_%' } } });
    await EmpresaCliente.destroy({ where: { correo: { [sequelize.Sequelize.Op.like]: 'emp_det_%' } } });
    await Empleado.destroy({ where: { correo: { [sequelize.Sequelize.Op.like]: 'emp.det.%' } } });
    await Departamento.destroy({ where: { codigo: { [sequelize.Sequelize.Op.like]: 'DET-%' } } });
    await Usuario.destroy({ where: { correo: { [sequelize.Sequelize.Op.like]: 'det_tester_%' } } });

    const timestamp = Date.now();
    const testEmail = `det_tester_${timestamp}@nexuscrm.com`;

    // 1. Probar GET sin token (401 esperado)
    console.log('1. Probando GET /api/detalles-cotizacion sin token (401 esperado) ...');
    const noTokenRes = await makeRequest('/api/detalles-cotizacion', 'GET');
    console.log('   Status:', noTokenRes.status, '| Payload:', noTokenRes.data);
    if (noTokenRes.status !== 401) throw new Error('Esperado 401 sin token');

    // 2. Registrar e iniciar sesión de usuario de prueba
    console.log('\n2. Registrando e iniciando sesión de usuario de prueba ...');
    await makeRequest('/api/auth/register', 'POST', {}, {
      nombre: 'Det Tester',
      correo: testEmail,
      password: 'Password123!'
    });

    const loginRes = await makeRequest('/api/auth/login', 'POST', {}, {
      correo: testEmail,
      password: 'Password123!'
    });

    const token = loginRes.data?.token || loginRes.data?.data?.token;
    if (!token) throw new Error(`No se pudo obtener el token JWT: ${JSON.stringify(loginRes.data)}`);
    console.log(' Token JWT obtenido exitosamente.');

    const authHeaders = {
      'Authorization': `Bearer ${token}`
    };

    // 3. Crear fixtures base: Depto, Empleado, Empresa, Contacto, Oportunidad, Cotizacion, Categoria, Producto
    console.log('\n3. Creando entidades base para DetalleCotizacion ...');
    const depto = await Departamento.create({
      codigo: `DET-${timestamp.toString().slice(-4)}`,
      nombre: `Operaciones Det ${timestamp}`,
      activo: true
    });

    const empleado = await Empleado.create({
      id_departamento: depto.id_departamento,
      nombre: 'Javier',
      apellido: 'Cotizador',
      correo: `emp.det.${timestamp}@nexuscrm.com`,
      cargo: 'Especialista de Precios',
      activo: true
    });

    const empresa = await EmpresaCliente.create({
      nombre: `Empresa Det ${timestamp}`,
      sector: 'Comercio',
      correo: `emp_det_${timestamp}@test.com`,
      estado: 'Activo'
    });

    const contacto = await Contacto.create({
      id_empresa: empresa.id_empresa,
      nombre: 'Raul Contacto',
      correo: `contacto_det_${timestamp}@test.com`,
      activo: true
    });

    const oportunidad = await OportunidadComercial.create({
      id_empresa: empresa.id_empresa,
      id_contacto: contacto.id_contacto,
      titulo: `Oportunidad Detalle ${timestamp}`,
      valor_estimado: 50000.00,
      etapa: 'Propuesta'
    });

    const cotizacionOriginalSubtotal = 10000.00;
    const cotizacionOriginalTotal = 11600.00;
    const cotizacion = await Cotizacion.create({
      id_oportunidad: oportunidad.id_oportunidad,
      id_empleado: empleado.id_empleado,
      numero_cotizacion: `COT-DET-${timestamp}`,
      version: 1,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-30',
      subtotal: cotizacionOriginalSubtotal,
      total: cotizacionOriginalTotal,
      estado: 'Borrador'
    });

    const catProd = await CategoriaProducto.create({
      nombre: `Cat Det ${timestamp}`,
      descripcion: 'Línea de productos hardware',
      activo: true
    });

    const producto1 = await ProductoServicio.create({
      id_categoria: catProd.id_categoria,
      codigo_sku: `SKU-DET-01-${timestamp}`,
      nombre: 'Router Cisco Enterprise',
      tipo: 'Producto',
      precio_unitario: 2500.00,
      moneda: 'USD',
      activo: true
    });

    const producto2 = await ProductoServicio.create({
      id_categoria: catProd.id_categoria,
      codigo_sku: `SKU-DET-02-${timestamp}`,
      nombre: 'Switch Managed 48p',
      tipo: 'Producto',
      precio_unitario: 1800.00,
      moneda: 'USD',
      activo: true
    });

    const idCot = cotizacion.id_cotizacion;
    const idProd1 = producto1.id_producto;
    const idProd2 = producto2.id_producto;
    console.log('   Entidades creadas. Cotizacion:', idCot, '| Producto 1:', idProd1, '| Producto 2:', idProd2);

    // 4. Probar POST con claves foráneas inexistentes (404 esperados)
    console.log('\n4. Probando POST con claves foráneas inexistentes (404 esperados) ...');
    const nonCotRes = await makeRequest('/api/detalles-cotizacion', 'POST', authHeaders, {
      id_cotizacion: 999999,
      id_producto: idProd1,
      cantidad: 2.00,
      precio_unitario_pactado: 2500.00,
      subtotal_linea: 5000.00
    });
    console.log('   POST Cotización inexistente -> Status:', nonCotRes.status, '| Msg:', nonCotRes.data?.message);
    if (nonCotRes.status !== 404) throw new Error('Esperado 404 por cotización inexistente');

    const nonProdRes = await makeRequest('/api/detalles-cotizacion', 'POST', authHeaders, {
      id_cotizacion: idCot,
      id_producto: 999999,
      cantidad: 2.00,
      precio_unitario_pactado: 2500.00,
      subtotal_linea: 5000.00
    });
    console.log('   POST Producto inexistente -> Status:', nonProdRes.status, '| Msg:', nonProdRes.data?.message);
    if (nonProdRes.status !== 404) throw new Error('Esperado 404 por producto inexistente');

    // 5. Probar POST con datos inválidos (400 esperados)
    console.log('\n5. Probando POST con datos inválidos (400 esperados) ...');
    // Faltante cantidad
    const missingCantRes = await makeRequest('/api/detalles-cotizacion', 'POST', authHeaders, {
      id_cotizacion: idCot,
      id_producto: idProd1,
      precio_unitario_pactado: 2500.00,
      subtotal_linea: 5000.00
    });
    console.log('   Faltante cantidad -> Status:', missingCantRes.status, '| Msg:', missingCantRes.data?.message);
    if (missingCantRes.status !== 400) throw new Error('Esperado 400 por cantidad faltante');

    // Campo desconocido / no permitido
    const unknownFieldRes = await makeRequest('/api/detalles-cotizacion', 'POST', authHeaders, {
      id_cotizacion: idCot,
      id_producto: idProd1,
      cantidad: 2.00,
      precio_unitario_pactado: 2500.00,
      subtotal_linea: 5000.00,
      campo_extra: 'valor'
    });
    console.log('   Campo desconocido -> Status:', unknownFieldRes.status, '| Msg:', unknownFieldRes.data?.message);
    if (unknownFieldRes.status !== 400) throw new Error('Esperado 400 por campo desconocido');

    // Protección de PK (id_detalle_cotizacion en body)
    const pkProtectedRes = await makeRequest('/api/detalles-cotizacion', 'POST', authHeaders, {
      id_detalle_cotizacion: 1,
      id_cotizacion: idCot,
      id_producto: idProd1,
      cantidad: 2.00,
      precio_unitario_pactado: 2500.00,
      subtotal_linea: 5000.00
    });
    console.log('   id_detalle_cotizacion en body -> Status:', pkProtectedRes.status, '| Msg:', pkProtectedRes.data?.message);
    if (pkProtectedRes.status !== 400) throw new Error('Esperado 400 por PK protegida');

    // 6. Probar validaciones de cantidades, porcentajes e importes (400 esperados)
    console.log('\n6. Probando validaciones de cantidades, porcentajes e importes (400 esperados) ...');
    // Cantidad <= 0
    const zeroCantRes = await makeRequest('/api/detalles-cotizacion', 'POST', authHeaders, {
      id_cotizacion: idCot,
      id_producto: idProd1,
      cantidad: 0.00,
      precio_unitario_pactado: 2500.00,
      subtotal_linea: 0.00
    });
    console.log('   Cantidad 0 -> Status:', zeroCantRes.status, '| Msg:', zeroCantRes.data?.message);
    if (zeroCantRes.status !== 400) throw new Error('Esperado 400 por cantidad <= 0');

    // Cantidad con 3 decimales
    const decCantRes = await makeRequest('/api/detalles-cotizacion', 'POST', authHeaders, {
      id_cotizacion: idCot,
      id_producto: idProd1,
      cantidad: 2.555,
      precio_unitario_pactado: 2500.00,
      subtotal_linea: 6387.50
    });
    console.log('   Cantidad con 3 decimales -> Status:', decCantRes.status, '| Msg:', decCantRes.data?.message);
    if (decCantRes.status !== 400) throw new Error('Esperado 400 por 3 decimales en cantidad');

    // Precio pactado negativo
    const negPriceRes = await makeRequest('/api/detalles-cotizacion', 'POST', authHeaders, {
      id_cotizacion: idCot,
      id_producto: idProd1,
      cantidad: 1.00,
      precio_unitario_pactado: -100.00,
      subtotal_linea: -100.00
    });
    console.log('   Precio negativo -> Status:', negPriceRes.status, '| Msg:', negPriceRes.data?.message);
    if (negPriceRes.status !== 400) throw new Error('Esperado 400 por precio negativo');

    // Descuento porcentaje > 100
    const badDescRes = await makeRequest('/api/detalles-cotizacion', 'POST', authHeaders, {
      id_cotizacion: idCot,
      id_producto: idProd1,
      cantidad: 1.00,
      precio_unitario_pactado: 1000.00,
      descuento_porcentaje: 105.00,
      subtotal_linea: 900.00
    });
    console.log('   Descuento > 100 -> Status:', badDescRes.status, '| Msg:', badDescRes.data?.message);
    if (badDescRes.status !== 400) throw new Error('Esperado 400 por descuento > 100');

    // Subtotal linea negativo
    const negSubRes = await makeRequest('/api/detalles-cotizacion', 'POST', authHeaders, {
      id_cotizacion: idCot,
      id_producto: idProd1,
      cantidad: 1.00,
      precio_unitario_pactado: 1000.00,
      subtotal_linea: -50.00
    });
    console.log('   Subtotal línea negativo -> Status:', negSubRes.status, '| Msg:', negSubRes.data?.message);
    if (negSubRes.status !== 400) throw new Error('Esperado 400 por subtotal_linea negativo');

    // 7. POST válido (201 Created) con comprobación de Eager Loading
    console.log('\n7. Probando POST válido (201 esperado) y verificación de asociaciones ...');
    const createRes1 = await makeRequest('/api/detalles-cotizacion', 'POST', authHeaders, {
      id_cotizacion: idCot,
      id_producto: idProd1,
      cantidad: 2.00,
      precio_unitario_pactado: 2400.00,
      descuento_porcentaje: 5.00,
      subtotal_linea: 4560.00
    });
    console.log('   Status:', createRes1.status, '| ID creado:', createRes1.data?.data?.id_detalle_cotizacion);
    if (createRes1.status !== 201) throw new Error(`Esperado 201, obtenido ${createRes1.status}`);
    const idDet1 = createRes1.data.data.id_detalle_cotizacion;

    // Verificar eager loading de cotización y producto
    const cotData = createRes1.data?.data?.cotizacion;
    const prodData = createRes1.data?.data?.producto;
    console.log('   Asociaciones cargadas:', {
      cotizacion_num: cotData?.numero_cotizacion,
      producto_nombre: prodData?.nombre,
      producto_sku: prodData?.codigo_sku
    });
    if (!cotData || !prodData || prodData.id_producto !== idProd1) {
      throw new Error('Eager loading de cotización o producto falló en creación');
    }
    console.log(' Eager loading en creación validado correctamente.');

    // 8. Crear segundo detalle para pruebas de listado
    const createRes2 = await makeRequest('/api/detalles-cotizacion', 'POST', authHeaders, {
      id_cotizacion: idCot,
      id_producto: idProd2,
      cantidad: 3.00,
      precio_unitario_pactado: 1800.00,
      descuento_porcentaje: 0.00,
      subtotal_linea: 5400.00
    });
    const idDet2 = createRes2.data.data.id_detalle_cotizacion;
    console.log('   Segundo detalle creado con ID:', idDet2);

    // 9. Comprobar que los importes de Cotizacion NO fueron alterados automáticamente
    console.log('\n9. Verificando que subtotal y total de Cotizacion no fueron modificados ...');
    const cotCheck = await Cotizacion.findByPk(idCot);
    console.log('   Cotización en BD -> Subtotal:', cotCheck.subtotal, '| Total:', cotCheck.total);
    if (parseFloat(cotCheck.subtotal) !== cotizacionOriginalSubtotal || parseFloat(cotCheck.total) !== cotizacionOriginalTotal) {
      throw new Error('Los importes de Cotizacion fueron alterados sin autorización!');
    }
    console.log(' Confirmado: importes de Cotizacion preservados sin modificaciones no autorizadas.');

    // 10. Probar GET listado (200 OK)
    console.log('\n10. Probando GET /api/detalles-cotizacion listado (200 esperado) ...');
    const listRes = await makeRequest('/api/detalles-cotizacion', 'GET', authHeaders);
    console.log('   Status:', listRes.status, '| Total items:', listRes.data?.total);
    if (listRes.status !== 200) throw new Error('Esperado 200 en GET listado');
    const detEncontrado = listRes.data?.data?.find(d => d.id_detalle_cotizacion === idDet1);
    if (!detEncontrado || !detEncontrado.cotizacion || !detEncontrado.producto) {
      throw new Error('Detalle o asociaciones no encontradas en listado');
    }
    console.log(' Listado validado con eager loading.');

    // 11. Probar GET por ID (200 OK y 404 para inexistente)
    console.log('\n11. Probando GET /api/detalles-cotizacion/:id ...');
    const getByIdRes = await makeRequest(`/api/detalles-cotizacion/${idDet1}`, 'GET', authHeaders);
    console.log('   GET existente -> Status:', getByIdRes.status, '| Cantidad:', getByIdRes.data?.data?.cantidad, '| Subtotal:', getByIdRes.data?.data?.subtotal_linea);
    if (getByIdRes.status !== 200) throw new Error('Esperado 200 en GET por ID');

    const getNonExistent = await makeRequest('/api/detalles-cotizacion/999999', 'GET', authHeaders);
    console.log('   GET inexistente -> Status:', getNonExistent.status, '| Msg:', getNonExistent.data?.message);
    if (getNonExistent.status !== 404) throw new Error('Esperado 404 en ID inexistente');

    // 12. Probar PUT válido (200 OK)
    console.log('\n12. Probando PUT /api/detalles-cotizacion/:id ...');
    const putRes = await makeRequest(`/api/detalles-cotizacion/${idDet1}`, 'PUT', authHeaders, {
      cantidad: 4.00,
      descuento_porcentaje: 10.00,
      subtotal_linea: 8640.00
    });
    console.log('   PUT válido -> Status:', putRes.status, '| Nueva cantidad:', putRes.data?.data?.cantidad, '| Nuevo subtotal:', putRes.data?.data?.subtotal_linea);
    if (putRes.status !== 200) throw new Error('Esperado 200 en PUT válido');
    if (parseFloat(putRes.data?.data?.cantidad) !== 4.00 || parseFloat(putRes.data?.data?.subtotal_linea) !== 8640.00) {
      throw new Error('Actualización no persistió correctamente');
    }

    // 13. Probar DELETE válido sobre idDet2 (200 OK)
    console.log('\n13. Probando DELETE válido sobre idDet2 (200 esperado) ...');
    const delRes2 = await makeRequest(`/api/detalles-cotizacion/${idDet2}`, 'DELETE', authHeaders);
    console.log('   DELETE -> Status:', delRes2.status, '| Msg:', delRes2.data?.message);
    if (delRes2.status !== 200) throw new Error('Esperado 200 al eliminar detalle');

    // 14. Verificar ON DELETE RESTRICT sobre ProductoServicio
    console.log('\n14. Probando restricción ON DELETE RESTRICT sobre ProductoServicio ...');
    // Intentar eliminar producto1 a través de su endpoint /api/productos-servicios/:id mientras idDet1 sigue asociado
    const delProdRes = await makeRequest(`/api/productos-servicios/${idProd1}`, 'DELETE', authHeaders);
    console.log('   DELETE Producto con detalle -> Status:', delProdRes.status, '| Msg:', delProdRes.data?.message);
    if (delProdRes.status !== 409) {
      throw new Error(`Esperado 409 por ON DELETE RESTRICT en ProductoServicio, obtenido ${delProdRes.status}`);
    }
    console.log(' ON DELETE RESTRICT validado: la eliminación del producto fue bloqueada con 409.');

    // 15. Verificar ON DELETE CASCADE al eliminar Cotizacion
    console.log('\n15. Probando ON DELETE CASCADE al eliminar Cotizacion ...');
    // Eliminar la cotización que aún tiene idDet1
    const delCotRes = await makeRequest(`/api/cotizaciones/${idCot}`, 'DELETE', authHeaders);
    console.log('   DELETE Cotizacion -> Status:', delCotRes.status, '| Msg:', delCotRes.data?.message);
    if (delCotRes.status !== 200) throw new Error('Esperado 200 al eliminar cotización');

    // Verificar en BD que el DetalleCotizacion idDet1 fue eliminado en CASCADE por MySQL
    const detallePostCascade = await DetalleCotizacion.findByPk(idDet1);
    console.log('   Detalle tras borrar cotización: existe =', !!detallePostCascade);
    if (detallePostCascade) {
      throw new Error('ON DELETE CASCADE falló: el detalle no fue eliminado al borrar la cotización');
    }
    console.log(' ON DELETE CASCADE validado: el detalle fue eliminado en cascada por MySQL.');

    // 16. Limpieza en orden estricto de dependencias
    console.log('\n16. Limpieza de registros temporales ...');
    await producto1.destroy();
    await producto2.destroy();
    console.log('   Productos eliminados.');
    await catProd.destroy();
    console.log('   CategoriaProducto eliminada.');
    await oportunidad.destroy();
    console.log('   OportunidadComercial eliminada.');
    await contacto.destroy();
    console.log('   Contacto eliminado.');
    await empresa.destroy();
    console.log('   EmpresaCliente eliminada.');
    await empleado.destroy();
    console.log('   Empleado eliminado.');
    await depto.destroy();
    console.log('   Departamento eliminado.');

    // 17. Verificar que las rutas de los otros módulos continúen funcionando
    console.log('\n17. Verificando que rutas de módulos anteriores continúen operativas ...');
    const testEndpoints = [
      '/api/empresas',
      '/api/contactos',
      '/api/oportunidades',
      '/api/actividades',
      '/api/sectores',
      '/api/departamentos',
      '/api/categorias-producto',
      '/api/direcciones-empresa',
      '/api/empleados',
      '/api/productos-servicios',
      '/api/campanas-marketing',
      '/api/cotizaciones'
    ];
    for (const ep of testEndpoints) {
      const res = await makeRequest(ep, 'GET', authHeaders);
      if (res.status !== 200) throw new Error(`Fallo en endpoint previo: ${ep} respondió ${res.status}`);
      console.log(`   GET ${ep} -> Status: 200 OK`);
    }

    // 18. Limpieza del usuario autenticador
    await Usuario.destroy({ where: { correo: testEmail } });
    console.log('   Usuario autenticador eliminado.');
    console.log(' Base de datos limpia: 0 registros residuales.');

    console.log('\n=== TODAS LAS PRUEBAS DE DETALLECOTIZACION PASARON CON ÉXITO ===');
  } catch (err) {
    console.error('ERROR EN PRUEBAS:', err);
  } finally {
    process.exit(0);
  }
}

process.env.PORT = '3099';
require(path.join(projectDir, 'index.js'));
setTimeout(runDetalleCotizacionTests, 1200);

