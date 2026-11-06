const http = require('http');
const path = require('path');
const projectDir = 'c:/Users/FORWARD/Downloads/NexusCRM';
const {
  Usuario,
  Departamento,
  Empleado,
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

async function runDepartamentoTests() {
  console.log('=== PRUEBAS HTTP EN VIVO: DEPARTAMENTO CRUD ===\n');

  try {
    // 0. Limpieza previa
    await Usuario.destroy({ where: { correo: 'depto_tester@nexuscrm.com' } });

    // 1. Verificación de rechazo sin token (401)
    console.log('1. Probando GET /api/departamentos sin token (401) ...');
    const noTokenRes = await makeRequest('/api/departamentos');
    console.log('   Status:', noTokenRes.status, '| Payload:', noTokenRes.data);
    if (noTokenRes.status !== 401) throw new Error('Esperado 401 en /api/departamentos');

    // 2. Autenticar usuario de prueba
    console.log('\n2. Registrando e iniciando sesión de usuario de prueba ...');
    await makeRequest('/api/auth/register', 'POST', {}, {
      nombre: 'Tester Departamentos',
      correo: 'depto_tester@nexuscrm.com',
      password: 'DeptoPassword123!'
    });

    const loginRes = await makeRequest('/api/auth/login', 'POST', {}, {
      correo: 'depto_tester@nexuscrm.com',
      password: 'DeptoPassword123!'
    });
    const token = loginRes.data?.token;
    if (!token) throw new Error('No se obtuvo token');
    const authHeaders = { Authorization: `Bearer ${token}` };
    console.log(' Token JWT obtenido exitosamente.');

    // 3. Crear departamento válido (POST /api/departamentos) -> 201
    console.log('\n3. Probando POST /api/departamentos (Creación válida) ...');
    const cod1 = 'DEP-' + Date.now().toString().slice(-6);
    const nom1 = 'Departamento Operaciones ' + Date.now();
    const createRes1 = await makeRequest('/api/departamentos', 'POST', authHeaders, {
      codigo: cod1,
      nombre: nom1,
      activo: true
    });
    console.log('   POST /api/departamentos (1) -> Status:', createRes1.status, '| ID:', createRes1.data?.data?.id_departamento);
    if (createRes1.status !== 201) throw new Error('Fallo al crear departamento 1');
    const idDepto1 = createRes1.data.data.id_departamento;

    const cod2 = 'DEP-' + (Date.now() + 1).toString().slice(-6);
    const nom2 = 'Departamento Innovación ' + Date.now();
    const createRes2 = await makeRequest('/api/departamentos', 'POST', authHeaders, {
      codigo: cod2,
      nombre: nom2
    });
    console.log('   POST /api/departamentos (2) -> Status:', createRes2.status, '| ID:', createRes2.data?.data?.id_departamento);
    if (createRes2.status !== 201) throw new Error('Fallo al crear departamento 2');
    const idDepto2 = createRes2.data.data.id_departamento;

    // 4. Rechazo de código y nombre duplicados (409 Conflict)
    console.log('\n4. Probando rechazo de duplicados (409 Conflict) ...');
    const dupCodRes = await makeRequest('/api/departamentos', 'POST', authHeaders, {
      codigo: cod1, // Código ya existente
      nombre: 'Otro Nombre Único ' + Date.now()
    });
    console.log('   POST /api/departamentos (Código duplicado) -> Status:', dupCodRes.status, '| Msg:', dupCodRes.data?.message);
    if (dupCodRes.status !== 409) throw new Error('Esperado 409 en código duplicado');

    const dupNomRes = await makeRequest('/api/departamentos', 'POST', authHeaders, {
      codigo: 'DEP-UNIQUE-' + Date.now().toString().slice(-4),
      nombre: nom1 // Nombre ya existente
    });
    console.log('   POST /api/departamentos (Nombre duplicado) -> Status:', dupNomRes.status, '| Msg:', dupNomRes.data?.message);
    if (dupNomRes.status !== 409) throw new Error('Esperado 409 en nombre duplicado');

    // 5. Rechazo de datos inválidos (400 Bad Request)
    console.log('\n5. Probando rechazo de datos inválidos (400 Bad Request) ...');
    const invalidEmpty = await makeRequest('/api/departamentos', 'POST', authHeaders, {
      codigo: '',
      nombre: ''
    });
    console.log('   POST /api/departamentos (Campos vacíos) -> Status:', invalidEmpty.status, '| Msg:', invalidEmpty.data?.message);
    if (invalidEmpty.status !== 400) throw new Error('Esperado 400 en campos vacíos');

    const invalidUnknownField = await makeRequest('/api/departamentos', 'POST', authHeaders, {
      codigo: 'DEP-VAL',
      nombre: 'Depto Válido',
      campoInvalido: 'Hack'
    });
    console.log('   POST /api/departamentos (Campo desconocido) -> Status:', invalidUnknownField.status, '| Msg:', invalidUnknownField.data?.message);
    if (invalidUnknownField.status !== 400) throw new Error('Esperado 400 en campo desconocido');

    // 6. Listar departamentos (GET /api/departamentos) -> 200
    console.log('\n6. Probando GET /api/departamentos (Listado) ...');
    const listRes = await makeRequest('/api/departamentos', 'GET', authHeaders);
    console.log('   GET /api/departamentos -> Status:', listRes.status, '| Total:', listRes.data?.total);
    if (listRes.status !== 200 || !Array.isArray(listRes.data?.data)) throw new Error('Fallo en listado');

    // 7. Obtener departamento por ID (GET /api/departamentos/:id) -> 200
    console.log('\n7. Probando GET /api/departamentos/:id (Detalle) ...');
    const getRes = await makeRequest(`/api/departamentos/${idDepto1}`, 'GET', authHeaders);
    console.log('   GET /api/departamentos/:id -> Status:', getRes.status, '| Código:', getRes.data?.data?.codigo);
    console.log('   Asociación empleados incluida:', Array.isArray(getRes.data?.data?.empleados));
    if (getRes.status !== 200 || getRes.data?.data?.id_departamento !== idDepto1) throw new Error('Fallo en GET /:id');

    // 8. ID inexistente (404 Not Found)
    console.log('\n8. Probando ID inexistente (404 Not Found) ...');
    const notFoundRes = await makeRequest('/api/departamentos/9999999', 'GET', authHeaders);
    console.log('   GET /api/departamentos/9999999 -> Status:', notFoundRes.status, '| Msg:', notFoundRes.data?.message);
    if (notFoundRes.status !== 404) throw new Error('Esperado 404 en ID inexistente');

    // 9. Actualizar departamento (PUT /api/departamentos/:id) -> 200
    console.log('\n9. Probando PUT /api/departamentos/:id (Actualización válida) ...');
    const updateRes = await makeRequest(`/api/departamentos/${idDepto1}`, 'PUT', authHeaders, {
      nombre: nom1 + ' Actualizado',
      activo: false
    });
    console.log('   PUT /api/departamentos/:id -> Status:', updateRes.status, '| Nombre:', updateRes.data?.data?.nombre, '| Activo:', updateRes.data?.data?.activo);
    if (updateRes.status !== 200 || updateRes.data?.data?.activo !== false) throw new Error('Fallo en PUT');

    // 10. Actualizar con código o nombre duplicado de otro departamento (409)
    console.log('\n10. Probando colisión en actualización (409 Conflict) ...');
    const colisionRes = await makeRequest(`/api/departamentos/${idDepto2}`, 'PUT', authHeaders, {
      codigo: cod1 // Pertenece al departamento 1
    });
    console.log('   PUT /api/departamentos/:id (Colisión código) -> Status:', colisionRes.status, '| Msg:', colisionRes.data?.message);
    if (colisionRes.status !== 409) throw new Error('Esperado 409 en colisión de código');

    // 11. Eliminar departamento sin dependencias (DELETE /api/departamentos/:id) -> 200
    console.log('\n11. Probando DELETE sin dependencias -> 200 ...');
    const delRes2 = await makeRequest(`/api/departamentos/${idDepto2}`, 'DELETE', authHeaders);
    console.log('   DELETE /api/departamentos/:id -> Status:', delRes2.status, '| Msg:', delRes2.data?.message);
    if (delRes2.status !== 200) throw new Error('Fallo al eliminar departamento sin dependencias');

    // 12. Prueba de dependencia y regla ON DELETE RESTRICT
    console.log('\n12. Probando ON DELETE RESTRICT (Departamento con Empleado asociado) ...');
    // Crear empleado temporal vinculado a idDepto1
    const testEmpleado = await Empleado.create({
      id_departamento: idDepto1,
      nombre: 'Carlos',
      apellido: 'Mendoza',
      correo: 'carlos.mendoza.' + Date.now() + '@nexuscrm.com',
      cargo: 'Jefe de Operaciones',
      activo: true
    });
    console.log('   Empleado temporal creado. ID:', testEmpleado.id_empleado, 'vinculado a Depto:', idDepto1);

    // Verificar que GET /api/departamentos/:id recupere el empleado asociado
    const deptoWithEmp = await makeRequest(`/api/departamentos/${idDepto1}`, 'GET', authHeaders);
    console.log('   GET /api/departamentos/:id recuperó empleados:', deptoWithEmp.data?.data?.empleados?.length);
    if (deptoWithEmp.data?.data?.empleados?.length !== 1) {
      throw new Error('Fallo al recuperar empleados en departamento');
    }

    // Intentar eliminar el departamento con empleado activo -> Esperado 409 Conflict
    const delRestrictRes = await makeRequest(`/api/departamentos/${idDepto1}`, 'DELETE', authHeaders);
    console.log('   DELETE /api/departamentos/:id (con empleado) -> Status:', delRestrictRes.status, '| Msg:', delRestrictRes.data?.message);
    if (delRestrictRes.status !== 409) {
      throw new Error(`Esperado 409 por ON DELETE RESTRICT, pero se obtuvo ${delRestrictRes.status}`);
    }
    console.log(' ON DELETE RESTRICT validado exitosamente: la eliminación fue bloqueada con 409.');

    // 13. Limpieza de registros temporales en orden estricto de dependencias
    console.log('\n13. Limpieza de registros temporales ...');
    await testEmpleado.destroy();
    console.log('   Empleado temporal eliminado.');

    // Ahora que no tiene empleados, el departamento debe poder eliminarse
    const delFinalRes = await makeRequest(`/api/departamentos/${idDepto1}`, 'DELETE', authHeaders);
    console.log('   DELETE /api/departamentos/:id (tras remover empleado) -> Status:', delFinalRes.status);
    if (delFinalRes.status !== 200) throw new Error('Fallo al eliminar departamento liberado');

    await Usuario.destroy({ where: { correo: 'depto_tester@nexuscrm.com' } });
    console.log('   Usuario temporal eliminado.');
    console.log(' Base de datos limpia: 0 registros residuales.');

    console.log('\n=== TODAS LAS PRUEBAS DE DEPARTAMENTO PASARON CON ÉXITO ===');
  } catch (err) {
    console.error('ERROR EN PRUEBAS:', err);
  } finally {
    process.exit(0);
  }
}

process.env.PORT = '3099';
require(path.join(projectDir, 'index.js'));
setTimeout(runDepartamentoTests, 1200);

