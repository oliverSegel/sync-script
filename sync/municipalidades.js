import { fileURLToPath } from 'url';
import { mysqlConnection } from '../db/mysql.js';
import { postgresConnection } from '../db/pgsql.js';
import fs from 'fs';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getMunicipalidadesMysql() {
  try {
    const query = 'SELECT * FROM municipa';
    const [rows] = await mysqlConnection.query(query);
    return rows;
  } catch (error) {
    throw new Error(`Error obteniendo municipalidades de MySQL: ${error.message}`);
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

async function getDistritoId(distritocod, deptocod) {
  try {
    const query = 'SELECT id_distrito FROM distritos WHERE codigo_distrito = $1 AND codigo_departamento = $2';
    const result = await postgresConnection.query(query, [distritocod, deptocod]);

    if (result.rows.length === 0) {
      throw new Error(`No se encontró distrito con código ${distritocod} y departamento ${deptocod}`);
    }
    return result.rows[0].id_distrito;
  } catch (error) {
    throw new Error(`Error buscando distrito: ${error.message}`);
  }
}

async function insertMunicipalidad(muniMySQL) {
  try {
    // Obtener IDs de departamento y distrito
    const departamentoId = await getDeptoId(muniMySQL.dpto);
    const distritoId = await getDistritoId(muniMySQL.distrito, muniMySQL.dpto);

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const urlFirma = path.join(__dirname, '../firma', `${muniMySQL.municod}.png`);
    const firma = getBinaryImageFromURL(urlFirma);

    const query = `
          INSERT INTO municipalidades (
              activo,
              codigo,
              departamento,
              direccion,
              distrito,
              expide_licencia,
              intendente,
              nombre,
              telefono,
              departamentos_id_departamento,
              distritos_id_distrito,
              nombre_intendente,
              firma,
              nombre_director_transito
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id_municipalidad;
      `;

    const values = [
      true, // activo siempre true
      muniMySQL.municod.toString(), // codigo = municod
      muniMySQL.dpto, // departamento = dpto
      muniMySQL.direccion || '', // direccion
      muniMySQL.distrito, // distrito
      muniMySQL.expideregi, // expide_licencia = expideregi
      muniMySQL.nombre_intendente, // intendente = nombre_intendente
      muniMySQL.nombre, // nombre
      muniMySQL.telefono || '', // telefono
      departamentoId, // departamentos_id_departamento
      distritoId, // distritos_id_distrito
      null, // nombre_intendente
      firma, // firma
      null // nombre_director_transito
    ];

    const result = await postgresConnection.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw new Error(`Error insertando municipalidad en Postgres: ${error.message}`);
  }
}

export async function sincronizarMunicipalidades() {
  console.log('Iniciando sincronización de municipalidades...');
  let totalSincronizados = 0;
  let errores = [];

  try {
    // Obtener todas las municipalidades de MySQL
    const municipalidades = await getMunicipalidadesMysql();
    console.log(`Se encontraron ${municipalidades.length} municipalidades para sincronizar`);

    // Procesar cada municipalidad

    for (const muni of municipalidades) {
      try {
        const resultado = await insertMunicipalidad(muni);
        totalSincronizados++;
        console.log(`Municipalidad ${muni.nombre} (ID: ${resultado.id_municipalidad}) creada exitosamente`);
      } catch (error) {
        errores.push({
          municod: muni.municod,
          nombre: muni.nombre,
          error: error.message
        });
        console.error(`Error sincronizando municipalidad ${muni.nombre} (${muni.municod}):`, error.message);
      }
    }

    // Resumen final
    console.log('\n=== Resumen de Sincronización ===');
    console.log(`Total de municipalidades procesadas: ${municipalidades.length}`);
    console.log(`Municipalidades sincronizadas exitosamente: ${totalSincronizados}`);
    console.log(`Errores encontrados: ${errores.length}`);

    if (errores.length > 0) {
      console.log('\nDetalle de errores:');
      errores.forEach(({ municod, nombre, error }) => {
        console.log(`- Municipalidad ${nombre} (${municod}): ${error}`);
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

// async function getBase64ImageFromURL(url) {
//   return new Promise((resolve, reject) => {
//     var img = new Image();
//     // img.setAttribute("crossOrigin", "anonymous");

//     img.onload = () => {
//       var canvas = document.createElement('canvas');
//       canvas.width = img.width;
//       canvas.height = img.height;

//       var ctx = canvas.getContext('2d');
//       ctx.drawImage(img, 0, 0);

//       var dataURL = canvas.toDataURL('image/png');
//       resolve(dataURL);
//     };

//     img.onerror = (error) => {
//       reject(error);
//     };

//     img.src = url;
//   });
// }

export function getBinaryImageFromURL(filePath) {
  if (fs.existsSync(filePath)) {
    const buffer = fs.readFileSync(filePath);
    return buffer; // Convierte el buffer a base64 si es necesario
  } else {
    const urlFirma = path.join(__dirname, '../firma', `no-firma.jpg`);
    console.log(filePath,"no existe")
    const buffer = fs.readFileSync(urlFirma);
    return buffer; // Retorna un string vacío si el archivo no existe
  }
}