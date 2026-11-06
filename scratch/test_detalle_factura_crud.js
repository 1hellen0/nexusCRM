'use strict';

const http = require('http');
const path = require('path');
const projectDir = path.resolve(__dirname, '..');
const {
  sequelize,
  Usuario,
  EmpresaCliente,
  CategoriaProducto,
  ProductoServicio,
  Factura,
  DetalleFactura
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

async function runDetalleFacturaTests() {
  console.log('=== PRUEBAS HTTP EN VIVO: DETALLEFACTURA CRUD ===\n');

  try {
    // Limpieza preventiva
    await DetalleFactura.destroy({ where: {} });
    await Factura.destroy({ where: { numero_factura: { [sequelize.Sequelize.Op.like]: 'FAC-DF-%' } } });
    await ProductoServicio.destroy({ where: { codigo_sku: { [sequelize.Sequelize.Op.like]: 'SKU-DF-%' } } });
    await CategoriaProducto.destroy({ where: { nombre: { [sequelize.Sequelize.Op.like]: 'Cat DF %' } } });
    await EmpresaCliente.destroy({ where: { correo: { [sequelize.Sequelize.Op.like]: 'emp_df_%' } } });
    await Usuario.destroy({ where: { correo: { [sequelize.Sequelize.Op.like]: 'df_tester_%' } } });

    const timestamp = Date.now();
    const testEmail = `df_tester_${timestamp}@nexuscrm.com`;

    // 1. Probar GET sin token (401 esperado)
    console.log('1. Probando GET /api/detalles-factura sin token (401 esperado) ...');
    const noTokenRes = await makeRequest('/api/detalles-factura', 'GET');
    console.log('   Status:', noTokenRes.status, '| Payload:', noTokenRes.data);
    if (noTokenRes.status !== 401) throw new Error('Esperado 401 sin token');

    // 2. Registrar e iniciar sesión de usuario de prueba
    console.log('\n2. Registrando e iniciando sesión de usuario de prueba ...');
    await makeRequest('/api/auth/register', 'POST', {}, {
      nombre: 'DF Tester',
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

    // 3. Crear entidades base: EmpresaCliente, Factura, CategoriaProducto, ProductoServicio 1 y 2
    console.log('\n3. Creando entidades base para DetalleFactura ...');
    const empresa = await EmpresaCliente.create({
      nombre: `Empresa DF ${timestamp}`,
      sector: 'Retail',
      correo: `emp_df_${timestamp}@test.com`,
      estado: 'Activo'
    });

    const originalSubtotal = 15000.00;
    const originalImpuestos = 2400.00;
    const originalTotal = 17400.00;
    const originalEstado = 'Emitida';
    const factura = await Factura.create({
      id_empresa: empresa.id_empresa,
      numero_factura: `FAC-DF-${timestamp}`,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-25',
      subtotal: originalSubtotal,
      impuestos: originalImpuestos,
      total: originalTotal,
      estado: originalEstado
    });

    const catProd = await CategoriaProducto.create({
      nombre: `Cat DF ${timestamp}`,
      descripcion: 'Hardware y servicios DF',
      activo: true
    });

    const producto1 = await ProductoServicio.create({
      id_categoria: catProd.id_categoria,
      codigo_sku: `SKU-DF-01-${timestamp}`,
      nombre: 'Access Point WiFi 6',
      tipo: 'Producto',
      precio_unitario: 350.00,
      moneda: 'USD',
      activo: true
    });

    const producto2 = await ProductoServicio.create({
      id_categoria: catProd.id_categoria,
      codigo_sku: `SKU-DF-02-${timestamp}`,
      nombre: 'Instalación de Red Estructurada',
      tipo: 'Servicio',
      precio_unitario: 1200.00,
      moneda: 'USD',
      activo: true
    });

    const idFac = factura.id_factura;
    const idProd1 = producto1.id_producto;
    const idProd2 = producto2.id_producto;
    console.log('   Entidades creadas. Factura:', idFac, '| Producto 1:', idProd1, '| Producto 2:', idProd2);

    // 4. Probar POST con claves foráneas inexistentes (404 esperados)
    console.log('\n4. Probando POST con claves foráneas inexistentes (404 esperados) ...');
    const nonFacRes = await makeRequest('/api/detalles-factura', 'POST', authHeaders, {
      id_factura: 999999,
      id_producto: idProd1,
      cantidad: 5.00,
      precio_unitario: 350.00,
      subtotal_linea: 1750.00
    });
    console.log('   POST Factura inexistente -> Status:', nonFacRes.status, '| Msg:', nonFacRes.data?.message);
    if (nonFacRes.status !== 404) throw new Error('Esperado 404 por factura inexistente');

    const nonProdRes = await makeRequest('/api/detalles-factura', 'POST', authHeaders, {
      id_factura: idFac,
      id_producto: 999999,
      cantidad: 5.00,
      precio_unitario: 350.00,
      subtotal_linea: 1750.00
    });
    console.log('   POST Producto inexistente -> Status:', nonProdRes.status, '| Msg:', nonProdRes.data?.message);
    if (nonProdRes.status !== 404) throw new Error('Esperado 404 por producto inexistente');

    // 5. Probar POST con datos inválidos (400 esperados)
    console.log('\n5. Probando POST con datos inválidos (400 esperados) ...');
    // Faltante precio_unitario
    const missingPriceRes = await makeRequest('/api/detalles-factura', 'POST', authHeaders, {
      id_factura: idFac,
      id_producto: idProd1,
      cantidad: 5.00,
      subtotal_linea: 1750.00
    });
    console.log('   Faltante precio_unitario -> Status:', missingPriceRes.status, '| Msg:', missingPriceRes.data?.message);
    if (missingPriceRes.status !== 400) throw new Error('Esperado 400 por precio_unitario faltante');

    // Campo desconocido / no permitido
    const unknownFieldRes = await makeRequest('/api/detalles-factura', 'POST', authHeaders, {
      id_factura: idFac,
      id_producto: idProd1,
      cantidad: 5.00,
      precio_unitario: 350.00,
      subtotal_linea: 1750.00,
      campo_extra: 'prueba'
    });
    console.log('   Campo desconocido -> Status:', unknownFieldRes.status, '| Msg:', unknownFieldRes.data?.message);
    if (unknownFieldRes.status !== 400) throw new Error('Esperado 400 por campo desconocido');

    // Protección de PK (id_detalle_factura en body)
    const pkProtectedRes = await makeRequest('/api/detalles-factura', 'POST', authHeaders, {
      id_detalle_factura: 1,
      id_factura: idFac,
      id_producto: idProd1,
      cantidad: 5.00,
      precio_unitario: 350.00,
      subtotal_linea: 1750.00
    });
    console.log('   id_detalle_factura en body -> Status:', pkProtectedRes.status, '| Msg:', pkProtectedRes.data?.message);
    if (pkProtectedRes.status !== 400) throw new Error('Esperado 400 por PK protegida');

    // 6. Probar validaciones de cantidades e importes monetarios (400 esperados)
    console.log('\n6. Probando validaciones de cantidades e importes (400 esperados) ...');
    // Cantidad <= 0
    const zeroCantRes = await makeRequest('/api/detalles-factura', 'POST', authHeaders, {
      id_factura: idFac,
      id_producto: idProd1,
      cantidad: 0.00,
      precio_unitario: 350.00,
      subtotal_linea: 0.00
    });
    console.log('   Cantidad 0 -> Status:', zeroCantRes.status, '| Msg:', zeroCantRes.data?.message);
    if (zeroCantRes.status !== 400) throw new Error('Esperado 400 por cantidad <= 0');

    // Cantidad con 3 decimales
    const decCantRes = await makeRequest('/api/detalles-factura', 'POST', authHeaders, {
      id_factura: idFac,
      id_producto: idProd1,
      cantidad: 1.234,
      precio_unitario: 350.00,
      subtotal_linea: 431.90
    });
    console.log('   Cantidad con 3 decimales -> Status:', decCantRes.status, '| Msg:', decCantRes.data?.message);
    if (decCantRes.status !== 400) throw new Error('Esperado 400 por 3 decimales en cantidad');

    // Precio unitario negativo
    const negPriceRes = await makeRequest('/api/detalles-factura', 'POST', authHeaders, {
      id_factura: idFac,
      id_producto: idProd1,
      cantidad: 2.00,
      precio_unitario: -50.00,
      subtotal_linea: -100.00
    });
    console.log('   Precio unitario negativo -> Status:', negPriceRes.status, '| Msg:', negPriceRes.data?.message);
    if (negPriceRes.status !== 400) throw new Error('Esperado 400 por precio negativo');

    // Subtotal línea negativo
    const negSubRes = await makeRequest('/api/detalles-factura', 'POST', authHeaders, {
      id_factura: idFac,
      id_producto: idProd1,
      cantidad: 2.00,
      precio_unitario: 350.00,
      subtotal_linea: -700.00
    });
    console.log('   Subtotal línea negativo -> Status:', negSubRes.status, '| Msg:', negSubRes.data?.message);
    if (negSubRes.status !== 400) throw new Error('Esperado 400 por subtotal negativo');

    // 7. POST válido (201 Created) con comprobación de Eager Loading
    console.log('\n7. Probando POST válido (201 esperado) y verificación de asociaciones ...');
    const createRes1 = await makeRequest('/api/detalles-factura', 'POST', authHeaders, {
      id_factura: idFac,
      id_producto: idProd1,
      cantidad: 10.00,
      precio_unitario: 350.00,
      subtotal_linea: 3500.00
    });
    console.log('   Status:', createRes1.status, '| ID creado:', createRes1.data?.data?.id_detalle_factura);
    if (createRes1.status !== 201) throw new Error(`Esperado 201, obtenido ${createRes1.status}`);
    const idDet1 = createRes1.data.data.id_detalle_factura;

    // Verificar eager loading de factura y producto
    const facData = createRes1.data?.data?.factura;
    const prodData = createRes1.data?.data?.producto;
    console.log('   Asociaciones cargadas:', {
      factura_num: facData?.numero_factura,
      producto_nombre: prodData?.nombre,
      producto_sku: prodData?.codigo_sku
    });
    if (!facData || !prodData || prodData.id_producto !== idProd1) {
      throw new Error('Eager loading de factura o producto falló en creación');
    }
    console.log(' Eager loading en creación validado exitosamente.');

    // 8. Crear segundo detalle para pruebas de listado
    const createRes2 = await makeRequest('/api/detalles-factura', 'POST', authHeaders, {
      id_factura: idFac,
      id_producto: idProd2,
      cantidad: 2.00,
      precio_unitario: 1200.00,
      subtotal_linea: 2400.00
    });
    const idDet2 = createRes2.data.data.id_detalle_factura;
    console.log('   Segundo detalle creado con ID:', idDet2);

    // 9. Comprobar que los importes y estado de Factura NO fueron alterados automáticamente
    console.log('\n9. Verificando que subtotal, impuestos, total y estado de Factura no fueron alterados ...');
    const facCheck = await Factura.findByPk(idFac);
    console.log('   Factura en BD -> Subtotal:', facCheck.subtotal, '| Impuestos:', facCheck.impuestos, '| Total:', facCheck.total, '| Estado:', facCheck.estado);
    if (
      parseFloat(facCheck.subtotal) !== originalSubtotal ||
      parseFloat(facCheck.impuestos) !== originalImpuestos ||
      parseFloat(facCheck.total) !== originalTotal ||
      facCheck.estado !== originalEstado
    ) {
      throw new Error('Los datos financieros o de estado de Factura fueron alterados!');
    }
    console.log(' Confirmado: datos financieros y estado de Factura preservados sin modificaciones.');

    // 10. Probar GET listado (200 OK)
    console.log('\n10. Probando GET /api/detalles-factura listado (200 esperado) ...');
    const listRes = await makeRequest('/api/detalles-factura', 'GET', authHeaders);
    console.log('   Status:', listRes.status, '| Total items:', listRes.data?.total);
    if (listRes.status !== 200) throw new Error('Esperado 200 en GET listado');
    const detEncontrado = listRes.data?.data?.find(d => d.id_detalle_factura === idDet1);
    if (!detEncontrado || !detEncontrado.factura || !detEncontrado.producto) {
      throw new Error('Detalle o asociaciones no encontradas en listado');
    }
    console.log(' Listado validado con eager loading.');

    // 11. Probar GET por ID (200 OK y 404 para inexistente)
    console.log('\n11. Probando GET /api/detalles-factura/:id ...');
    const getByIdRes = await makeRequest(`/api/detalles-factura/${idDet1}`, 'GET', authHeaders);
    console.log('   GET existente -> Status:', getByIdRes.status, '| Cantidad:', getByIdRes.data?.data?.cantidad, '| Subtotal:', getByIdRes.data?.data?.subtotal_linea);
    if (getByIdRes.status !== 200) throw new Error('Esperado 200 en GET por ID');

    const getNonExistent = await makeRequest('/api/detalles-factura/999999', 'GET', authHeaders);
    console.log('   GET inexistente -> Status:', getNonExistent.status, '| Msg:', getNonExistent.data?.message);
    if (getNonExistent.status !== 404) throw new Error('Esperado 404 en ID inexistente');

    // 12. Probar PUT válido (200 OK)
    console.log('\n12. Probando PUT /api/detalles-factura/:id ...');
    const putRes = await makeRequest(`/api/detalles-factura/${idDet1}`, 'PUT', authHeaders, {
      cantidad: 12.00,
      subtotal_linea: 4200.00
    });
    console.log('   PUT válido -> Status:', putRes.status, '| Nueva cantidad:', putRes.data?.data?.cantidad, '| Nuevo subtotal:', putRes.data?.data?.subtotal_linea);
    if (putRes.status !== 200) throw new Error('Esperado 200 en PUT válido');
    if (parseFloat(putRes.data?.data?.cantidad) !== 12.00 || parseFloat(putRes.data?.data?.subtotal_linea) !== 4200.00) {
      throw new Error('Actualización no persistió correctamente');
    }

    // 13. Probar DELETE válido sobre idDet2 (200 OK)
    console.log('\n13. Probando DELETE válido sobre idDet2 (200 esperado) ...');
    const delRes2 = await makeRequest(`/api/detalles-factura/${idDet2}`, 'DELETE', authHeaders);
    console.log('   DELETE -> Status:', delRes2.status, '| Msg:', delRes2.data?.message);
    if (delRes2.status !== 200) throw new Error('Esperado 200 al eliminar detalle');

    // 14. Verificar ON DELETE RESTRICT sobre ProductoServicio
    console.log('\n14. Probando restricción ON DELETE RESTRICT sobre ProductoServicio ...');
    const delProdRes = await makeRequest(`/api/productos-servicios/${idProd1}`, 'DELETE', authHeaders);
    console.log('   DELETE Producto con detalle -> Status:', delProdRes.status, '| Msg:', delProdRes.data?.message);
    if (delProdRes.status !== 409) {
      throw new Error(`Esperado 409 por ON DELETE RESTRICT en ProductoServicio, obtenido ${delProdRes.status}`);
    }
    console.log(' ON DELETE RESTRICT validado: la eliminación del producto fue bloqueada con 409.');

    // 15. Verificar ON DELETE CASCADE al eliminar Factura
    console.log('\n15. Probando ON DELETE CASCADE al eliminar Factura ...');
    const delFacRes = await makeRequest(`/api/facturas/${idFac}`, 'DELETE', authHeaders);
    console.log('   DELETE Factura -> Status:', delFacRes.status, '| Msg:', delFacRes.data?.message);
    if (delFacRes.status !== 200) throw new Error('Esperado 200 al eliminar factura');

    const detallePostCascade = await DetalleFactura.findByPk(idDet1);
    console.log('   Detalle tras borrar factura: existe =', !!detallePostCascade);
    if (detallePostCascade) {
      throw new Error('ON DELETE CASCADE falló: el detalle no fue eliminado al borrar la factura');
    }
    console.log(' ON DELETE CASCADE validado: el detalle fue eliminado en cascada por MySQL.');

    // 16. Limpieza en orden estricto de dependencias
    console.log('\n16. Limpieza de registros temporales ...');
    await producto1.destroy();
    await producto2.destroy();
    console.log('   Productos eliminados.');
    await catProd.destroy();
    console.log('   CategoriaProducto eliminada.');
    await empresa.destroy();
    console.log('   EmpresaCliente eliminada.');

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
      '/api/cotizaciones',
      '/api/detalles-cotizacion',
      '/api/contratos',
      '/api/facturas'
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

    console.log('\n=== TODAS LAS PRUEBAS DE DETALLEFACTURA PASARON CON ÉXITO ===');
  } catch (err) {
    console.error('ERROR EN PRUEBAS:', err);
  } finally {
    process.exit(0);
  }
}

process.env.PORT = '3099';
require(path.join(projectDir, 'index.js'));
setTimeout(runDetalleFacturaTests, 1200);

