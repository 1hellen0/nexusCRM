'use strict';

const http = require('http');
const path = require('path');
process.env.PORT = '3099';

const { Usuario, SectorEmpresarial } = require(path.join(__dirname, '..', 'models'));

const PORT = 3099;

function req(options, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers = { ...options.headers };
    if (body) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    const r = http.request({ hostname: '127.0.0.1', port: PORT, ...options, headers }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve({ s: res.statusCode, b: JSON.parse(data) }); }
        catch { resolve({ s: res.statusCode, b: data }); }
      });
    });
    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

async function run() {
  let passed = 0, failed = 0;
  const assert = (cond, msg) => {
    if (cond) { console.log(`  [PASS] ${msg}`); passed++; }
    else { console.error(`  [FAIL] ${msg}`); failed++; }
  };

  // 1. Registrar usuario de prueba
  const ts = Date.now();
  const correo = `api52_${ts}@nexuscrm.com`;
  const reg = await req({ path: '/api/auth/register', method: 'POST' }, { nombre: 'API52 Tester', correo, password: 'Test1234!' });
  assert(reg.s === 201, 'Register -> 201');
  const login = await req({ path: '/api/auth/login', method: 'POST' }, { correo, password: 'Test1234!' });
  const token = login.b?.token || login.b?.data?.token;
  assert(login.s === 200 && token, 'Login -> 200 + JWT token');

  const auth = { 'Authorization': `Bearer ${token}` };

  // Verificar GET de los 13 módulos nuevos + los 4 originales
  const endpoints = [
    '/api/empresas', '/api/contactos', '/api/oportunidades', '/api/actividades',
    '/api/sectores', '/api/departamentos', '/api/categorias-producto',
    '/api/direcciones-empresa', '/api/empleados', '/api/productos-servicios',
    '/api/campanas-marketing', '/api/cotizaciones', '/api/detalles-cotizacion',
    '/api/contratos', '/api/facturas', '/api/detalles-factura', '/api/pagos'
  ];

  for (const ep of endpoints) {
    const r = await req({ path: ep, method: 'GET', headers: auth });
    assert(r.s === 200 && r.b.status === 'success', `GET ${ep} -> 200 success`);
  }

  // Verificar filtros con query params (GET /api/sectores?activo=true)
  const rFilter = await req({ path: '/api/sectores?activo=true', method: 'GET', headers: auth });
  assert(rFilter.s === 200, 'GET /api/sectores?activo=true -> 200');

  // Verificar filtro por id_empresa en direcciones
  const rDir = await req({ path: '/api/direcciones-empresa?id_empresa=1', method: 'GET', headers: auth });
  assert(rDir.s === 200, 'GET /api/direcciones-empresa?id_empresa=1 -> 200');

  // Verificar filtro por id_factura en pagos
  const rPag = await req({ path: '/api/pagos?id_factura=1', method: 'GET', headers: auth });
  assert(rPag.s === 200, 'GET /api/pagos?id_factura=1 -> 200');

  // Verificar que el endpoint retorna lista como array en data
  const rSect = await req({ path: '/api/sectores', method: 'GET', headers: auth });
  assert(Array.isArray(rSect.b?.data), 'GET /api/sectores -> data es Array');

  // Limpieza
  await Usuario.destroy({ where: { correo } });
  console.log('\n  [CLEANUP] Usuario de prueba eliminado.');
  console.log(`\n=== RESULTADO: ${passed} pasadas / ${failed} fallidas ===`);
  process.exit(failed > 0 ? 1 : 0);
}

require(path.join(__dirname, '..', 'index.js'));
setTimeout(run, 1500);

