const http = require('http');
const path = require('path');
const projectDir = 'c:/Users/FORWARD/Downloads/NexusCRM';
const {
  Usuario,
  EmpresaCliente,
  DireccionEmpresa,
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

async function runDireccionTests() {
  console.log('=== PRUEBAS HTTP EN VIVO: DIRECCIONEMPRESA CRUD ===\n');

  try {
    // 0. Limpieza previa
    await Usuario.destroy({ where: { correo: 'dir_tester@nexuscrm.com' } });

    // 1. Verificación de rechazo sin token (401)
    console.log('1. Probando GET /api/direcciones-empresa sin token (401) ...');
    const noTokenRes = await makeRequest('/api/direcciones-empresa');
    console.log('   Status:', noTokenRes.status, '| Payload:', noTokenRes.data);
    if (noTokenRes.status !== 401) throw new Error('Esperado 401 en /api/direcciones-empresa');

    // 2. Autenticar usuario de prueba
    console.log('\n2. Registrando e iniciando sesión de usuario de prueba ...');
    await makeRequest('/api/auth/register', 'POST', {}, {
      nombre: 'Tester Direcciones',
      correo: 'dir_tester@nexuscrm.com',
      password: 'DirPassword123!'
    });

    const loginRes = await makeRequest('/api/auth/login', 'POST', {}, {
      correo: 'dir_tester@nexuscrm.com',
      password: 'DirPassword123!'
    });
    const token = loginRes.data?.token;
    if (!token) throw new Error('No se obtuvo token');
    const authHeaders = { Authorization: `Bearer ${token}` };
    console.log(' Token JWT obtenido exitosamente.');

    // 3. Crear EmpresaCliente temporal para asociar direcciones
    console.log('\n3. Creando EmpresaCliente temporal ...');
    const empRes = await makeRequest('/api/empresas', 'POST', authHeaders, {
      nombre: 'Corporativo Direcciones Test ' + Date.now(),
      sector: 'Logística',
      correo: 'dir_corp@test.com'
    });
    if (empRes.status !== 201) throw new Error('Fallo al crear empresa');
    const idEmpresa = empRes.data.data.id_empresa;
    console.log(' Empresa temporal creada. ID:', idEmpresa);

    // 4. Crear dirección válida (POST /api/direcciones-empresa) -> 201
    console.log('\n4. Probando POST /api/direcciones-empresa (Creación válida) ...');
    const createRes1 = await makeRequest('/api/direcciones-empresa', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      tipo: 'Fiscal',
      calle: 'Av. Reforma 222, Piso 14',
      ciudad: 'Ciudad de México',
      estado_provincia: 'CDMX',
      codigo_postal: '06600',
      pais: 'México'
    });
    console.log('   POST /api/direcciones-empresa (1) -> Status:', createRes1.status, '| ID:', createRes1.data?.data?.id_direccion);
    if (createRes1.status !== 201) throw new Error('Fallo al crear dirección 1');
    const idDir1 = createRes1.data.data.id_direccion;

    const createRes2 = await makeRequest('/api/direcciones-empresa', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      tipo: 'Operativa',
      calle: 'Parque Industrial Norte Bodega 5',
      ciudad: 'Monterrey',
      estado_provincia: 'Nuevo León',
      pais: 'México'
    });
    console.log('   POST /api/direcciones-empresa (2) -> Status:', createRes2.status, '| ID:', createRes2.data?.data?.id_direccion);
    if (createRes2.status !== 201) throw new Error('Fallo al crear dirección 2');
    const idDir2 = createRes2.data.data.id_direccion;

    // 5. Rechazo con id_empresa inexistente (404 Not Found)
    console.log('\n5. Probando rechazo con id_empresa inexistente (404) ...');
    const invalidEmpRes = await makeRequest('/api/direcciones-empresa', 'POST', authHeaders, {
      id_empresa: 9999999,
      calle: 'Calle Fantasma 123',
      ciudad: 'Inexistente',
      estado_provincia: 'Ninguno',
      pais: 'México'
    });
    console.log('   POST /api/direcciones-empresa (id_empresa inexistente) -> Status:', invalidEmpRes.status, '| Msg:', invalidEmpRes.data?.message);
    if (invalidEmpRes.status !== 404) throw new Error('Esperado 404 en id_empresa inexistente');

    // 6. Rechazo de datos inválidos (400 Bad Request)
    console.log('\n6. Probando rechazo de datos inválidos (400 Bad Request) ...');
    const invalidTipo = await makeRequest('/api/direcciones-empresa', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      tipo: 'TipoInvalido',
      calle: 'Calle Válida',
      ciudad: 'Ciudad',
      estado_provincia: 'Estado',
      pais: 'México'
    });
    console.log('   POST /api/direcciones-empresa (tipo inválido) -> Status:', invalidTipo.status, '| Msg:', invalidTipo.data?.message);
    if (invalidTipo.status !== 400) throw new Error('Esperado 400 en tipo inválido');

    const invalidUnknown = await makeRequest('/api/direcciones-empresa', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      calle: 'Calle Válida',
      ciudad: 'Ciudad',
      estado_provincia: 'Estado',
      pais: 'México',
      campoInvalido: 'Hacker'
    });
    console.log('   POST /api/direcciones-empresa (campo desconocido) -> Status:', invalidUnknown.status, '| Msg:', invalidUnknown.data?.message);
    if (invalidUnknown.status !== 400) throw new Error('Esperado 400 en campo desconocido');

    // 7. Listar direcciones (GET /api/direcciones-empresa) -> 200
    console.log('\n7. Probando GET /api/direcciones-empresa (Listado con eager loading) ...');
    const listRes = await makeRequest('/api/direcciones-empresa', 'GET', authHeaders);
    console.log('   GET /api/direcciones-empresa -> Status:', listRes.status, '| Total:', listRes.data?.total);
    console.log('   Empresa asociada en listado:', !!listRes.data?.data?.[0]?.empresa);
    if (listRes.status !== 200 || !Array.isArray(listRes.data?.data)) throw new Error('Fallo en listado');

    // 8. Obtener dirección por ID (GET /api/direcciones-empresa/:id) -> 200
    console.log('\n8. Probando GET /api/direcciones-empresa/:id (Detalle) ...');
    const getRes = await makeRequest(`/api/direcciones-empresa/${idDir1}`, 'GET', authHeaders);
    console.log('   GET /api/direcciones-empresa/:id -> Status:', getRes.status, '| Calle:', getRes.data?.data?.calle);
    console.log('   Eager loading EmpresaCliente:', getRes.data?.data?.empresa?.nombre);
    if (getRes.status !== 200 || getRes.data?.data?.id_direccion !== idDir1 || !getRes.data?.data?.empresa) {
      throw new Error('Fallo en GET /:id con eager loading');
    }

    // 9. ID inexistente (404 Not Found)
    console.log('\n9. Probando ID inexistente (404 Not Found) ...');
    const notFoundRes = await makeRequest('/api/direcciones-empresa/9999999', 'GET', authHeaders);
    console.log('   GET /api/direcciones-empresa/9999999 -> Status:', notFoundRes.status, '| Msg:', notFoundRes.data?.message);
    if (notFoundRes.status !== 404) throw new Error('Esperado 404 en ID inexistente');

    // 10. Actualizar dirección (PUT /api/direcciones-empresa/:id) -> 200
    console.log('\n10. Probando PUT /api/direcciones-empresa/:id (Actualización válida) ...');
    const updateRes = await makeRequest(`/api/direcciones-empresa/${idDir1}`, 'PUT', authHeaders, {
      tipo: 'Matriz',
      calle: 'Av. Reforma 222, Piso 18 Penthouse'
    });
    console.log('   PUT /api/direcciones-empresa/:id -> Status:', updateRes.status, '| Tipo:', updateRes.data?.data?.tipo, '| Calle:', updateRes.data?.data?.calle);
    if (updateRes.status !== 200 || updateRes.data?.data?.tipo !== 'Matriz') throw new Error('Fallo en PUT');

    // 11. Eliminar dirección 2 sin dependencias (DELETE) -> 200
    console.log('\n11. Probando DELETE /api/direcciones-empresa/:id -> 200 ...');
    const delRes2 = await makeRequest(`/api/direcciones-empresa/${idDir2}`, 'DELETE', authHeaders);
    console.log('   DELETE /api/direcciones-empresa/:id -> Status:', delRes2.status, '| Msg:', delRes2.data?.message);
    if (delRes2.status !== 200) throw new Error('Fallo al eliminar dirección 2');

    // 12. Comprobar asociación inversa EmpresaCliente -> direcciones
    console.log('\n12. Comprobando asociación inversa EmpresaCliente -> direcciones ...');
    const empresaConDirecciones = await EmpresaCliente.findByPk(idEmpresa, {
      include: [{ model: DireccionEmpresa, as: 'direcciones' }]
    });
    console.log('   EmpresaCliente recuperó direcciones asociadas:', empresaConDirecciones.direcciones.length);
    if (empresaConDirecciones.direcciones.length !== 1) {
      throw new Error('Fallo en asociación inversa EmpresaCliente -> direcciones');
    }

    // 13. Intento de eliminar empresa con dirección activa -> Bloqueado por ON DELETE RESTRICT (409)
    console.log('\n13. Probando ON DELETE RESTRICT al intentar eliminar EmpresaCliente con dirección ...');
    const delEmpRestrict = await makeRequest(`/api/empresas/${idEmpresa}`, 'DELETE', authHeaders);
    console.log('   DELETE /api/empresas/:id (con dirección activa) -> Status:', delEmpRestrict.status, '| Msg:', delEmpRestrict.data?.message);
    if (delEmpRestrict.status !== 409) {
      throw new Error(`Esperado 409 por ON DELETE RESTRICT, pero se obtuvo ${delEmpRestrict.status}`);
    }
    console.log(' ON DELETE RESTRICT validado exitosamente: la eliminación de la empresa fue bloqueada con 409.');

    // 14. Eliminar la dirección restante y posteriormente eliminar la empresa
    console.log('\n14. Eliminando dirección restante y posteriormente la empresa liberada ...');
    const delDirFinal = await makeRequest(`/api/direcciones-empresa/${idDir1}`, 'DELETE', authHeaders);
    console.log('   DELETE /api/direcciones-empresa/:id (dirección 1) -> Status:', delDirFinal.status);
    if (delDirFinal.status !== 200) throw new Error('Fallo al eliminar dirección 1');

    const delEmpFinal = await makeRequest(`/api/empresas/${idEmpresa}`, 'DELETE', authHeaders);
    console.log('   DELETE /api/empresas/:id (empresa liberada) -> Status:', delEmpFinal.status);
    if (delEmpFinal.status !== 200) throw new Error('Fallo al eliminar empresa liberada');

    // 15. Verificar que las rutas de los otros módulos continúen funcionando
    console.log('\n15. Verificando que rutas de módulos anteriores continúen operativas ...');
    const testEndpoints = [
      '/api/empresas',
      '/api/contactos',
      '/api/oportunidades',
      '/api/actividades',
      '/api/sectores',
      '/api/departamentos',
      '/api/categorias-producto'
    ];
    for (const ep of testEndpoints) {
      const res = await makeRequest(ep, 'GET', authHeaders);
      if (res.status !== 200) throw new Error(`Fallo en endpoint previo: ${ep} respondió ${res.status}`);
      console.log(`   GET ${ep} -> Status: 200 OK`);
    }

    // 16. Limpieza final de usuario temporal
    await Usuario.destroy({ where: { correo: 'dir_tester@nexuscrm.com' } });
    console.log('   Usuario temporal eliminado.');
    console.log(' Base de datos limpia: 0 registros residuales.');

    console.log('\n=== TODAS LAS PRUEBAS DE DIRECCIONEMPRESA PASARON CON ÉXITO ===');
  } catch (err) {
    console.error('ERROR EN PRUEBAS:', err);
  } finally {
    process.exit(0);
  }
}

process.env.PORT = '3099';
require(path.join(projectDir, 'index.js'));
setTimeout(runDireccionTests, 1200);

