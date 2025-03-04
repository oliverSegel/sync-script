import { mysqlConnection } from '../db/mysql.js';
import { postgresConnection } from '../db/pgsql.js';

async function getLotesMysql() {
  try {
    const query = 'SELECT * FROM lotes';
    const [rows] = await mysqlConnection.query(query);
    return rows;
  } catch (error) {
    throw new Error(`Error obteniendo lotes de MySQL: ${error.message}`);
  }
}

async function getMunicipalidadId(municod) {
  try {
    const query = 'SELECT id_municipalidad FROM municipalidades WHERE codigo = $1';
    const result = await postgresConnection.query(query, [municod]);

    if (result.rows.length === 0) {
      throw new Error(`No se encontró municipalidad con código ${municod}`);
    }

    return result.rows[0].id_municipalidad;
  } catch (error) {
    throw new Error(`Error buscando municipalidad: ${error.message}`);
  }
}
async function getDeptoId(deptocod) {
  try {
    const query = 'SELECT id_departamento FROM departamentos WHERE codigo = $1';
    const result = await postgresConnection.query(query, [deptocod]);

    if (result.rows.length === 0) {
      throw new Error(`No se encontró departamento con código ${deptocod}`);
    }

    return result.rows[0].id_departamento;
  } catch (error) {
    throw new Error(`Error buscando departamento: ${error.message}`);
  }
}

async function insertLoteCarnet(loteMySQL) {
  try {
    // Obtener el ID de la municipalidad correspondiente
    const municipalidadId = await getMunicipalidadId(loteMySQL.municod);
    const deptoId = await getDeptoId(loteMySQL.dpto);

    const query = `
            INSERT INTO lotes_carnets (
                dpto,
                fecha,
                municod,
                rangofin,
                rangoinicio,
                userid,
                departamentos_id_departamento,
                municipalidades_id_municipalidad,
                usuarios_id_usuario
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id_lote_carnet;
        `;

    const values = [
      loteMySQL.dpto,
      loteMySQL.fecha,
      loteMySQL.municod,
      loteMySQL.rangofin,
      loteMySQL.rangoinicio,
      loteMySQL.userid,
      deptoId,
      municipalidadId,
      1 //sistema
    ];

    const result = await postgresConnection.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw new Error(`Error insertando lote en Postgres: ${error.message}`);
  }
}

export async function sincronizarLotes() {
  console.log('Iniciando sincronización de lotes de carnets...');
  let totalSincronizados = 0;
  let errores = [];

  try {
    // Obtener todos los lotes de MySQL
    const lotes = await getLotesMysql();
    console.log(`Se encontraron ${lotes.length} lotes para sincronizar`);

    // Procesar cada lote
    for (const lote of lotes) {
      try {
        const resultado = await insertLoteCarnet(lote);
        totalSincronizados++;
        console.log(
          `Lote ${resultado.id_lote_carnet} creado exitosamente (MySQL dpto: ${lote.dpto}, municod: ${lote.municod})`
        );
      } catch (error) {
        errores.push({
          dpto: lote.dpto,
          municod: lote.municod,
          error: error.message
        });
        console.error(`Error sincronizando lote (dpto: ${lote.dpto}, municod: ${lote.municod}):`, error.message);
      }
    }

    // Resumen final
    console.log('\n=== Resumen de Sincronización ===');
    console.log(`Total de lotes procesados: ${lotes.length}`);
    console.log(`Lotes sincronizados exitosamente: ${totalSincronizados}`);
    console.log(`Errores encontrados: ${errores.length}`);

    if (errores.length > 0) {
      console.log('\nDetalle de errores:');
      errores.forEach(({ dpto, municod, error }) => {
        console.log(`- Lote (dpto: ${dpto}, municod: ${municod}): ${error}`);
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
