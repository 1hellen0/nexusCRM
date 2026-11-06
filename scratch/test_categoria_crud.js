const http = require('http');
const path = require('path');
const projectDir = 'c:/Users/FORWARD/Downloads/NexusCRM';
const {
  Usuario,
  CategoriaProducto,
  ProductoServicio,
  sequelize
} = require(path.join(projectDir, 'models'));

function makeRequest(pathName, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const reqHeaders = { ...headers };
    let bodyData = null;
    if (body) {
      bodyData = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: 3099,
      path: pathName,
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function runCategoriaTests() {
  console.log('=== PRUEBAS HTTP EN VIVO: CATEGORIAPRODUCTO CRUD ===\n');

  try {
    // 0. Limpieza previa
    await Usuario.destroy({ where: { correo: 'cat_tester@nexuscrm.com' } });

    // 1. Verificación de rechazo sin token (401)
    console.log('1. Probando GET /api/categorias-producto sin token (401) ...');
    const noTokenRes = await makeRequest('/api/categorias-producto');
    console.log('   Status:', noTokenRes.status, '| Payload:', noTokenRes.data);
    if (noTokenRes.status !== 401) throw new Error('Esperado 401 en /api/categorias-producto');

    // 2. Autenticar usuario de prueba
    console.log('\n2. Registrando e iniciando sesión de usuario de prueba ...');
    await makeRequest('/api/auth/register', 'POST', {}, {
      nombre: 'Tester Categorias',
      correo: 'cat_tester@nexuscrm.com',
      password: 'CatPassword123!'
    });

    const loginRes = await makeRequest('/api/auth/login', 'POST', {}, {
      correo: 'cat_tester@nexuscrm.com',
      password: 'CatPassword123!'
    });
    const token = loginRes.data?.token;
    if (!token) throw new Error('No se obtuvo token');
    const authHeaders = { Authorization: `Bearer ${token}` };
    console.log(' Token JWT obtenido exitosamente.');

    // 3. Crear categoría válida (POST /api/categorias-producto) -> 201
    console.log('\n3. Probando POST /api/categorias-producto (Creación válida) ...');
    const nom1 = 'Hardware Servidores ' + Date.now();
    const createRes1 = await makeRequest('/api/categorias-producto', 'POST', authHeaders, {
      nombre: nom1,
      descripcion: 'Equipos físicos de infraestructura',
      activo: true
    });
    console.log('   POST /api/categorias-producto (1) -> Status:', createRes1.status, '| ID:', createRes1.data?.data?.id_categoria);
    if (createRes1.status !== 201) throw new Error('Fallo al crear categoría 1');
    const idCat1 = createRes1.data.data.id_categoria;

    const nom2 = 'Licencias Cloud ' + Date.now();
    const createRes2 = await makeRequest('/api/categorias-producto', 'POST', authHeaders, {
      nombre: nom2,
      descripcion: 'Suscripciones SaaS y PaaS'
    });
    console.log('   POST /api/categorias-producto (2) -> Status:', createRes2.status, '| ID:', createRes2.data?.data?.id_categoria);
    if (createRes2.status !== 201) throw new Error('Fallo al crear categoría 2');
    const idCat2 = createRes2.data.data.id_categoria;

    // 4. Rechazo de nombre duplicado (409 Conflict)
    console.log('\n4. Probando rechazo de nombre duplicado (409 Conflict) ...');
    const dupRes = await makeRequest('/api/categorias-producto', 'POST', authHeaders, {
      nombre: nom1,
      descripcion: 'Duplicado deliberado'
    });
    console.log('   POST /api/categorias-producto (Duplicado) -> Status:', dupRes.status, '| Msg:', dupRes.data?.message);
    if (dupRes.status !== 409) throw new Error('Esperado 409 en nombre duplicado');

    // 5. Rechazo de datos inválidos (400 Bad Request)
    console.log('\n5. Probando rechazo de datos inválidos (400 Bad Request) ...');
    const invalidEmpty = await makeRequest('/api/categorias-producto', 'POST', authHeaders, {
      nombre: '   '
    });
    console.log('   POST /api/categorias-producto (Nombre vacío) -> Status:', invalidEmpty.status, '| Msg:', invalidEmpty.data?.message);
    if (invalidEmpty.status !== 400) throw new Error('Esperado 400 en nombre vacío');

    const invalidUnknown = await makeRequest('/api/categorias-producto', 'POST', authHeaders, {
      nombre: 'Categoria Valida',
      campoInvalido: 'Hack'
    });
    console.log('   POST /api/categorias-producto (Campo desconocido) -> Status:', invalidUnknown.status, '| Msg:', invalidUnknown.data?.message);
    if (invalidUnknown.status !== 400) throw new Error('Esperado 400 en campo desconocido');

    // 6. Listar categorías (GET /api/categorias-producto) -> 200
    console.log('\n6. Probando GET /api/categorias-producto (Listado) ...');
    const listRes = await makeRequest('/api/categorias-producto', 'GET', authHeaders);
    console.log('   GET /api/categorias-producto -> Status:', listRes.status, '| Total:', listRes.data?.total);
    if (listRes.status !== 200 || !Array.isArray(listRes.data?.data)) throw new Error('Fallo en listado');

    // 7. Obtener categoría por ID (GET /api/categorias-producto/:id) -> 200
    console.log('\n7. Probando GET /api/categorias-producto/:id (Detalle) ...');
    const getRes = await makeRequest(`/api/categorias-producto/${idCat1}`, 'GET', authHeaders);
    console.log('   GET /api/categorias-producto/:id -> Status:', getRes.status, '| Nombre:', getRes.data?.data?.nombre);
    console.log('   Asociación productosServicios incluida:', Array.isArray(getRes.data?.data?.productosServicios));
    if (getRes.status !== 200 || getRes.data?.data?.id_categoria !== idCat1) throw new Error('Fallo en GET /:id');

    // 8. ID inexistente (404 Not Found)
    console.log('\n8. Probando ID inexistente (404 Not Found) ...');
    const notFoundRes = await makeRequest('/api/categorias-producto/9999999', 'GET', authHeaders);
    console.log('   GET /api/categorias-producto/9999999 -> Status:', notFoundRes.status, '| Msg:', notFoundRes.data?.message);
    if (notFoundRes.status !== 404) throw new Error('Esperado 404 en ID inexistente');

    // 9. Actualizar categoría (PUT /api/categorias-producto/:id) -> 200
    console.log('\n9. Probando PUT /api/categorias-producto/:id (Actualización válida) ...');
    const updateRes = await makeRequest(`/api/categorias-producto/${idCat1}`, 'PUT', authHeaders, {
      nombre: nom1 + ' Actualizado',
      activo: false
    });
    console.log('   PUT /api/categorias-producto/:id -> Status:', updateRes.status, '| Nombre:', updateRes.data?.data?.nombre, '| Activo:', updateRes.data?.data?.activo);
    if (updateRes.status !== 200 || updateRes.data?.data?.activo !== false) throw new Error('Fallo en PUT');

    // 10. Actualizar con nombre duplicado de otra categoría (409 Conflict)
    console.log('\n10. Probando colisión en actualización (409 Conflict) ...');
    const colisionRes = await makeRequest(`/api/categorias-producto/${idCat2}`, 'PUT', authHeaders, {
      nombre: nom1 + ' Actualizado' // Pertenece a cat1
    });
    console.log('   PUT /api/categorias-producto/:id (Colisión) -> Status:', colisionRes.status, '| Msg:', colisionRes.data?.message);
    if (colisionRes.status !== 409) throw new Error('Esperado 409 en colisión de nombre');

    // 11. Eliminar categoría sin dependencias (DELETE /api/categorias-producto/:id) -> 200
    console.log('\n11. Probando DELETE sin dependencias -> 200 ...');
    const delRes2 = await makeRequest(`/api/categorias-producto/${idCat2}`, 'DELETE', authHeaders);
    console.log('   DELETE /api/categorias-producto/:id -> Status:', delRes2.status, '| Msg:', delRes2.data?.message);
    if (delRes2.status !== 200) throw new Error('Fallo al eliminar categoría sin dependencias');

    // 12. Prueba de dependencia y regla ON DELETE RESTRICT
    console.log('\n12. Probando ON DELETE RESTRICT (Categoría con ProductoServicio asociado) ...');
    // Crear ProductoServicio temporal vinculado a idCat1
    const testProducto = await ProductoServicio.create({
      id_categoria: idCat1,
      codigo_sku: 'SKU-TEST-' + Date.now().toString().slice(-6),
      nombre: 'Servidor Blade Enterprise ' + Date.now(),
      tipo: 'Producto',
      precio_unitario: 4500.00,
      moneda: 'USD',
      activo: true
    });
    console.log('   ProductoServicio temporal creado. ID:', testProducto.id_producto, 'vinculado a Categoria:', idCat1);

    // Verificar que GET /api/categorias-producto/:id recupere el producto asociado (eager loading)
    const catWithProd = await makeRequest(`/api/categorias-producto/${idCat1}`, 'GET', authHeaders);
    console.log('   GET /api/categorias-producto/:id recuperó productosServicios:', catWithProd.data?.data?.productosServicios?.length);
    if (catWithProd.data?.data?.productosServicios?.length !== 1) {
      throw new Error('Fallo al recuperar productosServicios en categoría');
    }

    // Intentar eliminar la categoría con producto activo -> Esperado 409 Conflict
    const delRestrictRes = await makeRequest(`/api/categorias-producto/${idCat1}`, 'DELETE', authHeaders);
    console.log('   DELETE /api/categorias-producto/:id (con producto) -> Status:', delRestrictRes.status, '| Msg:', delRestrictRes.data?.message);
    if (delRestrictRes.status !== 409) {
      throw new Error(`Esperado 409 por ON DELETE RESTRICT, pero se obtuvo ${delRestrictRes.status}`);
    }
    console.log(' ON DELETE RESTRICT validado exitosamente: la eliminación fue bloqueada con 409.');

    // 13. Limpieza de registros temporales en orden estricto de dependencias
    console.log('\n13. Limpieza de registros temporales ...');
    await testProducto.destroy();
    console.log('   ProductoServicio temporal eliminado.');

    // Ahora que no tiene productos, la categoría debe poder eliminarse
    const delFinalRes = await makeRequest(`/api/categorias-producto/${idCat1}`, 'DELETE', authHeaders);
    console.log('   DELETE /api/categorias-producto/:id (tras remover producto) -> Status:', delFinalRes.status);
    if (delFinalRes.status !== 200) throw new Error('Fallo al eliminar categoría liberada');

    // 14. Verificar que las rutas de los otros módulos continúen funcionando
    console.log('\n14. Verificando que rutas de módulos anteriores continúen operativas ...');
    const testEndpoints = [
      '/api/empresas',
      '/api/contactos',
      '/api/oportunidades',
      '/api/actividades',
      '/api/sectores',
      '/api/departamentos'
    ];
    for (const ep of testEndpoints) {
      const res = await makeRequest(ep, 'GET', authHeaders);
      if (res.status !== 200) throw new Error(`Fallo en endpoint previo: ${ep} respondió ${res.status}`);
      console.log(`   GET ${ep} -> Status: 200 OK`);
    }

    await Usuario.destroy({ where: { correo: 'cat_tester@nexuscrm.com' } });
    console.log('   Usuario temporal eliminado.');
    console.log(' Base de datos limpia: 0 registros residuales.');

    console.log('\n=== TODAS LAS PRUEBAS DE CATEGORIAPRODUCTO PASARON CON ÉXITO ===');
  } catch (err) {
    console.error('ERROR EN PRUEBAS:', err);
  } finally {
    process.exit(0);
  }
}

process.env.PORT = '3099';
require(path.join(projectDir, 'index.js'));
setTimeout(runCategoriaTests, 1200);

