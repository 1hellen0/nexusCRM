'use strict';

const http = require('http');
const path = require('path');
const projectDir = path.resolve(__dirname, '..');
const {
  sequelize,
  Usuario,
  CategoriaProducto,
  ProductoServicio,
  EmpresaCliente,
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

async function runProductoServicioTests() {
  console.log('=== PRUEBAS HTTP EN VIVO: PRODUCTOSERVICIO CRUD ===\n');

  try {
    // Limpieza preventiva de restos
    await ProductoServicio.destroy({ where: { codigo_sku: { [sequelize.Sequelize.Op.like]: 'SKU-%' } } });
    await CategoriaProducto.destroy({ where: { nombre: { [sequelize.Sequelize.Op.like]: 'Software Lic_%' } } });
    await Usuario.destroy({ where: { correo: { [sequelize.Sequelize.Op.like]: 'prod_tester_%' } } });

    const timestamp = Date.now();
    const testEmail = `prod_tester_${timestamp}@nexuscrm.com`;

    // 1. Probar GET sin token (debe retornar 401)
    console.log('1. Probando GET /api/productos-servicios sin token (401 esperado) ...');
    const noTokenRes = await makeRequest('/api/productos-servicios', 'GET');
    console.log('   Status:', noTokenRes.status, '| Payload:', noTokenRes.data);
    if (noTokenRes.status !== 401) throw new Error('Esperado 401 sin token');

    // 2. Registrar e iniciar sesión para obtener JWT
    console.log('\n2. Registrando e iniciando sesión de usuario de prueba ...');
    await makeRequest('/api/auth/register', 'POST', {}, {
      nombre: 'Prod Tester',
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

    // 3. Crear Categoría de Producto temporal
    console.log('\n3. Creando CategoriaProducto temporal ...');
    const catTemp = await CategoriaProducto.create({
      nombre: `Software Lic_${timestamp}`,
      descripcion: 'Licencias de software corporativo',
      activo: true
    });
    const idCat = catTemp.id_categoria;
    console.log('   Categoria creada. ID:', idCat);

    // 4. Probar POST con CategoriaProducto inexistente (debe rechazar con 404)
    console.log('\n4. Probando POST con CategoriaProducto inexistente (404 esperado) ...');
    const nonCatRes = await makeRequest('/api/productos-servicios', 'POST', authHeaders, {
      id_categoria: 999999,
      codigo_sku: `SKU-TEST-NONCAT-${timestamp}`,
      nombre: 'Producto Invalido',
      tipo: 'Producto',
      precio_unitario: 100.00
    });
    console.log('   Status:', nonCatRes.status, '| Msg:', nonCatRes.data?.message);
    if (nonCatRes.status !== 404) throw new Error(`Esperado 404, obtenido ${nonCatRes.status}`);

    // 5. Probar POST con validaciones de campos requeridos y tipos (400 esperados)
    console.log('\n5. Probando POST con datos inválidos (400 esperados) ...');
    // Faltante precio_unitario
    const missingPriceRes = await makeRequest('/api/productos-servicios', 'POST', authHeaders, {
      id_categoria: idCat,
      codigo_sku: `SKU-${timestamp}`,
      nombre: 'Producto Sin Precio',
      tipo: 'Producto'
    });
    console.log('   POST sin precio_unitario -> Status:', missingPriceRes.status, '| Msg:', missingPriceRes.data?.message);
    if (missingPriceRes.status !== 400) throw new Error('Esperado 400 por precio faltante');

    // Tipo inválido (no ENUM)
    const invalidTypeRes = await makeRequest('/api/productos-servicios', 'POST', authHeaders, {
      id_categoria: idCat,
      codigo_sku: `SKU-T-${timestamp}`,
      nombre: 'Producto Tipo Invalido',
      tipo: 'Invalido',
      precio_unitario: 50.00
    });
    console.log('   POST tipo inválido -> Status:', invalidTypeRes.status, '| Msg:', invalidTypeRes.data?.message);
    if (invalidTypeRes.status !== 400) throw new Error('Esperado 400 por tipo no ENUM');

    // Campo desconocido / no permitido
    const unknownFieldRes = await makeRequest('/api/productos-servicios', 'POST', authHeaders, {
      id_categoria: idCat,
      codigo_sku: `SKU-U-${timestamp}`,
      nombre: 'Producto Campo Desconocido',
      tipo: 'Producto',
      precio_unitario: 50.00,
      campo_inventado: 'foo'
    });
    console.log('   POST campo no permitido -> Status:', unknownFieldRes.status, '| Msg:', unknownFieldRes.data?.message);
    if (unknownFieldRes.status !== 400) throw new Error('Esperado 400 por campo desconocido');

    // Protección de PK (id_producto enviado en el body)
    const pkProtectedRes = await makeRequest('/api/productos-servicios', 'POST', authHeaders, {
      id_producto: 1,
      id_categoria: idCat,
      codigo_sku: `SKU-PK-${timestamp}`,
      nombre: 'Producto PK',
      tipo: 'Producto',
      precio_unitario: 50.00
    });
    console.log('   POST con id_producto en body -> Status:', pkProtectedRes.status, '| Msg:', pkProtectedRes.data?.message);
    if (pkProtectedRes.status !== 400) throw new Error('Esperado 400 por id_producto en body');

    // 6. Validaciones monetarias y precisión decimal (400 esperados)
    console.log('\n6. Probando validaciones monetarias y precisión decimal (400 esperados) ...');
    // Precio negativo
    const negPriceRes = await makeRequest('/api/productos-servicios', 'POST', authHeaders, {
      id_categoria: idCat,
      codigo_sku: `SKU-NEG-${timestamp}`,
      nombre: 'Producto Negativo',
      tipo: 'Producto',
      precio_unitario: -15.50
    });
    console.log('   Precio negativo -> Status:', negPriceRes.status, '| Msg:', negPriceRes.data?.message);
    if (negPriceRes.status !== 400) throw new Error('Esperado 400 por precio negativo');

    // Precio con más de 2 decimales
    const decPriceRes = await makeRequest('/api/productos-servicios', 'POST', authHeaders, {
      id_categoria: idCat,
      codigo_sku: `SKU-DEC-${timestamp}`,
      nombre: 'Producto Más Decimales',
      tipo: 'Producto',
      precio_unitario: 100.999
    });
    console.log('   Precio con 3 decimales -> Status:', decPriceRes.status, '| Msg:', decPriceRes.data?.message);
    if (decPriceRes.status !== 400) throw new Error('Esperado 400 por más de 2 decimales');

    // Precio no numérico
    const strPriceRes = await makeRequest('/api/productos-servicios', 'POST', authHeaders, {
      id_categoria: idCat,
      codigo_sku: `SKU-STR-${timestamp}`,
      nombre: 'Producto Precio String',
      tipo: 'Producto',
      precio_unitario: 'gratis'
    });
    console.log('   Precio "gratis" -> Status:', strPriceRes.status, '| Msg:', strPriceRes.data?.message);
    if (strPriceRes.status !== 400) throw new Error('Esperado 400 por precio no numérico');

    // 7. POST válido (201 Created) con verificación de Eager Loading
    console.log('\n7. Probando POST válido (201 esperado) y comprobación de eager loading ...');
    const sku1 = `SKU-CORP-${timestamp}`;
    const createRes1 = await makeRequest('/api/productos-servicios', 'POST', authHeaders, {
      id_categoria: idCat,
      codigo_sku: sku1,
      nombre: 'Suscripción ERP Nexus Cloud',
      tipo: 'Servicio',
      precio_unitario: 1250.50,
      moneda: 'USD',
      activo: true
    });
    console.log('   Status:', createRes1.status, '| ID creado:', createRes1.data?.data?.id_producto);
    if (createRes1.status !== 201) throw new Error(`Esperado 201, obtenido ${createRes1.status}`);
    const idProd1 = createRes1.data.data.id_producto;

    // Verificar eager loading de categoria
    console.log('   Eager loading categoria:', createRes1.data?.data?.categoria);
    if (!createRes1.data?.data?.categoria?.id_categoria || createRes1.data.data.categoria.nombre !== catTemp.nombre) {
      throw new Error('Eager loading de categoria falló en POST');
    }
    console.log(' Eager loading en creación validado correctamente.');

    // 8. Crear segundo producto para pruebas de unicidad y listado
    const sku2 = `SKU-LIC-${timestamp}`;
    const createRes2 = await makeRequest('/api/productos-servicios', 'POST', authHeaders, {
      id_categoria: idCat,
      codigo_sku: sku2,
      nombre: 'Licencia Servidor Dedicado',
      tipo: 'Producto',
      precio_unitario: 3500.00,
      moneda: 'USD',
      activo: true
    });
    const idProd2 = createRes2.data.data.id_producto;
    console.log('   Segundo producto creado con ID:', idProd2);

    // 9. Probar POST con SKU duplicado (409 esperado)
    console.log('\n9. Probando POST con SKU duplicado (409 esperado) ...');
    const dupSkuPost = await makeRequest('/api/productos-servicios', 'POST', authHeaders, {
      id_categoria: idCat,
      codigo_sku: sku1,
      nombre: 'Otro Producto Con Mismo SKU',
      tipo: 'Producto',
      precio_unitario: 200.00
    });
    console.log('   POST SKU duplicado -> Status:', dupSkuPost.status, '| Msg:', dupSkuPost.data?.message);
    if (dupSkuPost.status !== 409) throw new Error(`Esperado 409 por SKU duplicado, obtenido ${dupSkuPost.status}`);

    // 10. Probar GET listado (200 OK)
    console.log('\n10. Probando GET /api/productos-servicios listado (200 esperado) ...');
    const listRes = await makeRequest('/api/productos-servicios', 'GET', authHeaders);
    console.log('   Status:', listRes.status, '| Total items:', listRes.data?.total);
    if (listRes.status !== 200) throw new Error('Esperado 200 en GET listado');
    const itemEncontrado = listRes.data?.data?.find(p => p.id_producto === idProd1);
    if (!itemEncontrado || !itemEncontrado.categoria) {
      throw new Error('El item no se encontró o no tiene eager loading en listado');
    }
    console.log(' Listado validado con eager loading de CategoriaProducto.');

    // 11. Probar GET por ID (200 OK y 404 para inexistente)
    console.log('\n11. Probando GET /api/productos-servicios/:id ...');
    const getByIdRes = await makeRequest(`/api/productos-servicios/${idProd1}`, 'GET', authHeaders);
    console.log('   GET existente -> Status:', getByIdRes.status, '| Nombre:', getByIdRes.data?.data?.nombre);
    if (getByIdRes.status !== 200) throw new Error('Esperado 200 en GET por ID');
    if (!getByIdRes.data?.data?.categoria?.id_categoria) {
      throw new Error('Eager loading falló en GET por ID');
    }

    const getNonExistent = await makeRequest('/api/productos-servicios/999999', 'GET', authHeaders);
    console.log('   GET inexistente -> Status:', getNonExistent.status, '| Msg:', getNonExistent.data?.message);
    if (getNonExistent.status !== 404) throw new Error('Esperado 404 en ID inexistente');

    // 12. Probar PUT válido (200 OK)
    console.log('\n12. Probando PUT /api/productos-servicios/:id ...');
    const putRes = await makeRequest(`/api/productos-servicios/${idProd1}`, 'PUT', authHeaders, {
      nombre: 'Suscripción ERP Nexus Cloud Enterprise',
      precio_unitario: 1499.99,
      moneda: 'USD'
    });
    console.log('   PUT válido -> Status:', putRes.status, '| Nuevo nombre:', putRes.data?.data?.nombre, '| Precio:', putRes.data?.data?.precio_unitario);
    if (putRes.status !== 200) throw new Error('Esperado 200 en PUT válido');
    if (putRes.data?.data?.nombre !== 'Suscripción ERP Nexus Cloud Enterprise') {
      throw new Error('Actualización de nombre no persistió');
    }

    // 13. Probar PUT con SKU duplicado de otro registro (409 esperado)
    console.log('\n13. Probando PUT con SKU duplicado de otro registro (409 esperado) ...');
    const dupSkuPut = await makeRequest(`/api/productos-servicios/${idProd1}`, 'PUT', authHeaders, {
      codigo_sku: sku2
    });
    console.log('   PUT SKU duplicado -> Status:', dupSkuPut.status, '| Msg:', dupSkuPut.data?.message);
    if (dupSkuPut.status !== 409) throw new Error('Esperado 409 en PUT con SKU duplicado');

    // 14. Probar DELETE válido sin dependencias (200 OK)
    console.log('\n14. Probando DELETE válido sin dependencias sobre idProd2 (200 esperado) ...');
    const delRes2 = await makeRequest(`/api/productos-servicios/${idProd2}`, 'DELETE', authHeaders);
    console.log('   DELETE -> Status:', delRes2.status, '| Msg:', delRes2.data?.message);
    if (delRes2.status !== 200) throw new Error('Esperado 200 al eliminar producto sin dependencias');

    // 15. Probar restricción de integridad referencial con DetalleFactura (409 esperado)
    console.log('\n15. Probando integridad referencial con DetalleFactura (409 esperado) ...');
    // Crear EmpresaCliente y Factura temporal para asociar DetalleFactura
    const testEmpresa = await EmpresaCliente.create({
      nombre: `Empresa Test Prod ${timestamp}`,
      sector: 'Tecnología',
      correo: `emp_prod_${timestamp}@test.com`,
      estado: 'Activo'
    });

    const testFactura = await Factura.create({
      id_empresa: testEmpresa.id_empresa,
      numero_factura: `FAC-TEST-${timestamp}`,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-20',
      subtotal: 1499.99,
      impuestos: 239.99,
      total: 1739.98,
      estado: 'Emitida'
    });

    const testDetalle = await DetalleFactura.create({
      id_factura: testFactura.id_factura,
      id_producto: idProd1,
      cantidad: 1.00,
      precio_unitario: 1499.99,
      subtotal_linea: 1499.99
    });
    console.log('   DetalleFactura temporal creado. ID:', testDetalle.id_detalle_factura, 'asociado a Producto:', idProd1);

    // Intentar eliminar idProd1 teniendo DetalleFactura dependiente
    const delRestrictRes = await makeRequest(`/api/productos-servicios/${idProd1}`, 'DELETE', authHeaders);
    console.log('   DELETE con dependencia -> Status:', delRestrictRes.status, '| Msg:', delRestrictRes.data?.message);
    if (delRestrictRes.status !== 409) {
      throw new Error(`Esperado 409 por restricción referencial, pero se obtuvo ${delRestrictRes.status}`);
    }
    console.log(' Restricción referencial ON DELETE RESTRICT validada: eliminación bloqueada con 409.');

    // 16. Limpieza en orden estricto de dependencias
    console.log('\n16. Limpieza de registros temporales ...');
    await testDetalle.destroy();
    console.log('   DetalleFactura temporal eliminado.');
    await testFactura.destroy();
    console.log('   Factura temporal eliminada.');
    await testEmpresa.destroy();
    console.log('   EmpresaCliente temporal eliminada.');

    const delFinalRes = await makeRequest(`/api/productos-servicios/${idProd1}`, 'DELETE', authHeaders);
    console.log('   DELETE producto liberado -> Status:', delFinalRes.status);
    if (delFinalRes.status !== 200) throw new Error('Fallo al eliminar producto liberado');

    await catTemp.destroy();
    console.log('   CategoriaProducto temporal eliminada.');

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
      '/api/empleados'
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

    console.log('\n=== TODAS LAS PRUEBAS DE PRODUCTOSERVICIO PASARON CON ÉXITO ===');
  } catch (err) {
    console.error('ERROR EN PRUEBAS:', err);
  } finally {
    process.exit(0);
  }
}

process.env.PORT = '3099';
require(path.join(projectDir, 'index.js'));
setTimeout(runProductoServicioTests, 1200);
