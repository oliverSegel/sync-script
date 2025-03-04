import { mysqlConnection } from './db/mysql.js';
import { postgresConnection } from './db/pgsql.js';
import createPermisions from './sync/createPermisions.js';
import { syncEscuelas } from './sync/escuelas.js';
import { sincronizarLotes } from './sync/lotes.js';
import { sincronizarMunicipalidades } from './sync/municipalidades.js';
import { prechargeData } from './sync/prechargeData.js';
import createUsers from './sync/usersExcel.js';

console.clear();
console.log('Iniciando Sincronizacion');
const sincronizar = true;

await prechargeData();
if (sincronizar) {
  await sincronizarMunicipalidades(); //checkeado, municipalidades de paises y de prueba no hace sync, all work
  await sincronizarLotes(); // checkeado, all work
  await syncEscuelas(); // checkeado, all work

  await createPermisions();
  await createUsers();
}

try {
  await mysqlConnection.end();
  await postgresConnection.end();
  console.log('\nConexiones cerradas correctamente');
} catch (error) {
  console.error('Error cerrando conexiones:', error.message);
}
console.log('finalizado');
