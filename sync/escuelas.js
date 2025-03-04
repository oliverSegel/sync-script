import { mysqlConnection } from '../db/mysql.js';
import { postgresConnection } from '../db/pgsql.js';

//pendiente
async function getEscuelaMysql() {
  try {
    const query = 'SELECT * FROM escuelas';
    const [rows] = await mysqlConnection.query(query);
    return rows;
  } catch (error) {
    throw new Error(`Error obteniendo escuelas de MySQL: ${error.message}`);
  }
}
async function insertEscuela(userSQL) {
  try {
    const query = `
          INSERT INTO escuelas_conduccion (
              nombre,
              direccion,
              localidad,
              telefono,
              ruc,
              contacto,
              observacion
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id;
      `;

    const values = [
      userSQL.descripcion,
      userSQL.direccion,
      userSQL.localidad,
      userSQL.telefono,
      userSQL.ruc,
      userSQL.contacto,
      userSQL.observacion
    ];
    const result = await postgresConnection.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw new Error(`Error insertando escuela en Postgres: ${error.message}`);
  }
}

export async function syncEscuelas() {
  console.log('Iniciando sincronización de escuelas...');
  let totalSincronizados = 0;
  let errores = [];

  try {
    const escuelas = await getEscuelaMysql();
    console.log(`Se encontraron ${escuelas.length} escuelas para sincronizar`);

    // Procesar cada municipalidad
    for (const escu of escuelas) {
      try {
        const resultado = await insertEscuela(escu);
        totalSincronizados++;
        console.log(`Escuela ${escu.descripcion} (ID: ${resultado.id}) creada exitosamente`);
      } catch (error) {
        errores.push({
          municod: escu.codigo,
          nombre: escu.descripcion,
          error: error.message
        });
        console.error(`Error sincronizando Escuela ${escu.codigo} (${escu.descripcion}):`, error.message);
      }
    }

    // Resumen final
    console.log('\n=== Resumen de Sincronización ===');
    console.log(`Total de escuelas procesadas: ${escuelas.length}`);
    console.log(`Escuelas sincronizadas exitosamente: ${totalSincronizados}`);
    console.log(`Errores encontrados: ${errores.length}`);

    if (errores.length > 0) {
      console.log('\nDetalle de errores:');
      errores.forEach((error) => {
        console.log(error)
        // console.log(`- Escuela ${descripcion} (${codigo}): ${error}`);
      });
    }
  } catch (error) {
    console.error('Error general durante la sincronización:', error.message);
    throw error;
  } finally {
    // Cerrar conexiones
    // try {
    //   await mysqlConnection.end();
    //   await postgresConnection.end();
    //   console.log('\nConexiones cerradas correctamente');
    // } catch (error) {
    //   console.error('Error cerrando conexiones:', error.message);
    // }
  }
}
