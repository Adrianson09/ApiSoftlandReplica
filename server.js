const express = require('express');
const sql = require('mssql');
const bodyParser = require('body-parser');
const cors = require('cors');
const { poolPromise } = require('./dbConfig');

const app = express();
const port = 3000;

// Configura CORS
app.use(cors({
  origin: '*', // Añade aquí los orígenes permitidos
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true  
  // Reemplaza con el origen de tu frontend si es diferente
}));

app.use(express.json());
// Configuración del middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Endpoint para obtener compañías
app.get('/api/companias', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT conjunto FROM erpadmin.conjunto ORDER BY conjunto');
    res.json(result.recordset); // Devuelve las compañías ordenadas
  } catch (err) {
    console.error('Error al obtener compañías:', err);
    res.status(500).send('Error al obtener las compañías');
  }
});

// Endpoint para obtener proveedores
app.get('/api/proveedores', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT proveedor, nombre FROM base.proveedor ORDER BY proveedor');
    res.json(result.recordset); // Devuelve los proveedores ordenados
  } catch (err) {
    console.error('Error al obtener proveedores:', err);
    res.status(500).send('Error al obtener los proveedores');
  }
});


app.post('/api/validarProveedor', async (req, res) => {
  const { compania, proveedor } = req.body;

  try {
    const pool = await poolPromise;
    
    const query = `
      SELECT contribuyente, proveedor
      FROM ${compania}.proveedor
      WHERE proveedor = @proveedor
    `;

    const result = await pool.request()
      .input('proveedor', proveedor)
      .query(query);

    if (result.recordset.length > 0) {
      // Proveedor existe en la compañía seleccionada
      res.json({ exists: true, contribuyente: result.recordset[0].contribuyente });
    } else {
      // Proveedor no existe
      res.json({ exists: false });
    }

  } catch (err) {
    console.error('Error al validar el proveedor:', err);
    res.status(500).send('Error al validar el proveedor');
  }
});


app.post('/api/validarNIT', async (req, res) => {
  const { compania, contribuyente } = req.body;

  try {
    const pool = await poolPromise;
    
    const query = `
      SELECT NIT, RAZON_SOCIAL, ALIAS, NOTAS, TIPO, USA_REPORTE_D151, ORIGEN, NUMERO_DOC_NIT, SUCURSAL, EXTERIOR, DIRECCION, NATURALEZA, ACTIVO
      FROM ${compania}.nit
      WHERE NIT = @contribuyente
    `;

    const result = await pool.request()
      .input('contribuyente', contribuyente)
      .query(query);

    if (result.recordset.length > 0) {
      // NIT ya existe
      res.json({ exists: true });
    } else {
      // NIT no existe
      res.json({ exists: false });
    }

  } catch (err) {
    console.error('Error al validar el NIT:', err);
    res.status(500).send('Error al validar el NIT');
  }
});


app.post('/api/insertarNIT', async (req, res) => {
  const { compania, contribuyente } = req.body;

  try {
    const pool = await poolPromise;

    // Primero validamos si el NIT ya existe
    const checkQuery = `
      SELECT NIT
      FROM ${compania}.nit
      WHERE NIT = @contribuyente
    `;
    const checkResult = await pool.request()
      .input('contribuyente', contribuyente)
      .query(checkQuery);

    if (checkResult.recordset.length > 0) {
      // El NIT ya existe, no hacemos el insert
      res.status(400).send('El NIT ya existe.');
    } else {
      // Insertamos el nuevo NIT
      const insertQuery = `
        INSERT INTO ${compania}.nit (NIT, RAZON_SOCIAL, ALIAS, NOTAS, TIPO, USA_REPORTE_D151, ORIGEN, NUMERO_DOC_NIT, SUCURSAL, EXTERIOR, DIRECCION, NATURALEZA, ACTIVO)
        SELECT NIT, RAZON_SOCIAL, ALIAS, NOTAS, TIPO, USA_REPORTE_D151, ORIGEN, NUMERO_DOC_NIT, SUCURSAL, EXTERIOR, DIRECCION, NATURALEZA, ACTIVO
        FROM BASE.nit
        WHERE NIT = @contribuyente
      `;
      await pool.request()
        .input('contribuyente', contribuyente)
        .query(insertQuery);

      res.status(200).send('NIT insertado correctamente.');
    }

  } catch (err) {
    console.error('Error al insertar NIT:', err);
    res.status(500).send('Error al insertar NIT.');
  }
});


app.post('/api/insertarProveedor', async (req, res) => {
  const { compania, proveedor } = req.body;

  try {
    const pool = await poolPromise;

    // Insertamos el proveedor
    const insertQuery = `
      INSERT INTO ${compania}.proveedor
      (PROVEEDOR, NOMBRE, ALIAS, CONTACTO, CARGO, DIRECCION, E_MAIL, FECHA_INGRESO, FECHA_ULT_MOV, TELEFONO1, TELEFONO2, FAX, ORDEN_MINIMA, DESCUENTO, TASA_INTERES_MORA, LOCAL, CONGELADO, CONTRIBUYENTE, CONDICION_PAGO, MONEDA, PAIS, CATEGORIA_PROVEED, MULTIMONEDA, SALDO, SALDO_LOCAL, SALDO_DOLAR, NOTAS, ACTIVO, AUTORETENEDOR, SALDO_TRANS, SALDO_TRANS_LOCAL, SALDO_TRANS_DOLAR, PERMITE_DOC_GP, PARTICIPA_FLUJOCAJA, USUARIO_CREACION, FECHA_HORA_CREACION, IMPUESTO1_INCLUIDO, ACEPTA_DOC_ELECTRONICO, INTERNACIONES, usa_plame)
      SELECT PROVEEDOR, NOMBRE, ALIAS, CONTACTO, CARGO, DIRECCION, E_MAIL, FECHA_INGRESO, FECHA_ULT_MOV, TELEFONO1, TELEFONO2, FAX, ORDEN_MINIMA, DESCUENTO, TASA_INTERES_MORA, LOCAL, CONGELADO, CONTRIBUYENTE, CONDICION_PAGO, MONEDA, PAIS, CATEGORIA_PROVEED, MULTIMONEDA, SALDO, SALDO_LOCAL, SALDO_DOLAR, NOTAS, ACTIVO, AUTORETENEDOR, SALDO_TRANS, SALDO_TRANS_LOCAL, SALDO_TRANS_DOLAR, PERMITE_DOC_GP, PARTICIPA_FLUJOCAJA, USUARIO_CREACION, FECHA_HORA_CREACION, IMPUESTO1_INCLUIDO, ACEPTA_DOC_ELECTRONICO, INTERNACIONES, usa_plame
      FROM BASE.PROVEEDOR
      WHERE PROVEEDOR = @proveedor
    `;

    await pool.request()
      .input('proveedor', proveedor)
      .query(insertQuery);

    res.status(200).send('Proveedor insertado correctamente.');
  } catch (err) {
    console.error('Error al insertar proveedor:', err);
    res.status(500).send('Error al insertar proveedor.');
  }
});


app.post('/api/insertarProveedorEntidad', async (req, res) => {
  const { compania, proveedor } = req.body;

  try {
    const pool = await poolPromise;

    const insertQuery = `
      INSERT INTO ${compania}.PROVEEDOR_ENTIDAD (proveedor, entidad_financiera, CUENTA_BANCO, MONEDA, NOTAS)
      SELECT proveedor, entidad_financiera, CUENTA_BANCO, MONEDA, NOTAS
      FROM BASE.PROVEEDOR_ENTIDAD
      WHERE proveedor = @proveedor
    `;

    await pool.request()
      .input('proveedor', proveedor)
      .query(insertQuery);

    res.status(200).send('Entidad del proveedor insertada correctamente.');
  } catch (err) {
    console.error('Error al insertar entidad del proveedor:', err);
    res.status(500).send('Error al insertar entidad del proveedor.');
  }
});


app.post('/api/replicarProveedor', async (req, res) => {
  const { compania, proveedor } = req.body;

  try {
    const pool = await poolPromise;

    // Primero, obtenemos el contribuyente asociado al proveedor desde la base principal
    const contribuyenteQuery = `
      SELECT contribuyente
      FROM BASE.proveedor
      WHERE proveedor = @proveedor
    `;
    const contribuyenteResult = await pool.request()
      .input('proveedor', proveedor)
      .query(contribuyenteQuery);

    if (contribuyenteResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado en la base principal.' });
    }

    const contribuyente = contribuyenteResult.recordset[0].contribuyente;

    // Verificamos si el NIT (contribuyente) existe en la tabla de la compañía seleccionada
    const nitQuery = `
      SELECT NIT
      FROM ${compania}.nit
      WHERE NIT = @contribuyente
    `;
    const nitResult = await pool.request()
      .input('contribuyente', contribuyente)
      .query(nitQuery);

    // Si el NIT no existe, lo insertamos desde la tabla base
    if (nitResult.recordset.length === 0) {
      const insertNitQuery = `
        INSERT INTO ${compania}.nit (NIT, RAZON_SOCIAL, ALIAS, NOTAS, TIPO, USA_REPORTE_D151, ORIGEN, NUMERO_DOC_NIT, SUCURSAL, EXTERIOR, DIRECCION, NATURALEZA, ACTIVO)
        SELECT NIT, RAZON_SOCIAL, ALIAS, NOTAS, TIPO, USA_REPORTE_D151, ORIGEN, NUMERO_DOC_NIT, SUCURSAL, EXTERIOR, DIRECCION, NATURALEZA, ACTIVO
        FROM BASE.nit
        WHERE NIT = @contribuyente
      `;
      await pool.request()
        .input('contribuyente', contribuyente)
        .query(insertNitQuery);
    }

    // Ahora que el NIT está asegurado, insertamos el proveedor en la tabla de la compañía
    const insertProveedorQuery = `
      INSERT INTO ${compania}.proveedor (PROVEEDOR, NOMBRE, ALIAS, CONTACTO, CARGO, DIRECCION, E_MAIL, FECHA_INGRESO, FECHA_ULT_MOV, TELEFONO1, TELEFONO2, FAX, ORDEN_MINIMA, DESCUENTO, TASA_INTERES_MORA, LOCAL, CONGELADO, CONTRIBUYENTE, CONDICION_PAGO, MONEDA, PAIS, CATEGORIA_PROVEED, MULTIMONEDA, SALDO, SALDO_LOCAL, SALDO_DOLAR, NOTAS, ACTIVO, AUTORETENEDOR, SALDO_TRANS, SALDO_TRANS_LOCAL, SALDO_TRANS_DOLAR, PERMITE_DOC_GP, PARTICIPA_FLUJOCAJA, USUARIO_CREACION, FECHA_HORA_CREACION, IMPUESTO1_INCLUIDO, ACEPTA_DOC_ELECTRONICO, INTERNACIONES, usa_plame)
      SELECT PROVEEDOR, NOMBRE, ALIAS, CONTACTO, CARGO, DIRECCION, E_MAIL, FECHA_INGRESO, FECHA_ULT_MOV, TELEFONO1, TELEFONO2, FAX, ORDEN_MINIMA, DESCUENTO, TASA_INTERES_MORA, LOCAL, CONGELADO, CONTRIBUYENTE, CONDICION_PAGO, MONEDA, PAIS, CATEGORIA_PROVEED, MULTIMONEDA, SALDO, SALDO_LOCAL, SALDO_DOLAR, NOTAS, ACTIVO, AUTORETENEDOR, SALDO_TRANS, SALDO_TRANS_LOCAL, SALDO_TRANS_DOLAR, PERMITE_DOC_GP, PARTICIPA_FLUJOCAJA, USUARIO_CREACION, FECHA_HORA_CREACION, IMPUESTO1_INCLUIDO, ACEPTA_DOC_ELECTRONICO, INTERNACIONES, usa_plame
      FROM BASE.proveedor
      WHERE PROVEEDOR = @proveedor
    `;
    await pool.request()
      .input('proveedor', proveedor)
      .query(insertProveedorQuery);

    // Ahora insertamos las entidades financieras del proveedor si existen
    const insertEntidadQuery = `
      INSERT INTO ${compania}.PROVEEDOR_ENTIDAD (proveedor, entidad_financiera, CUENTA_BANCO, MONEDA, NOTAS)
      SELECT proveedor, entidad_financiera, CUENTA_BANCO, MONEDA, NOTAS
      FROM BASE.PROVEEDOR_ENTIDAD
      WHERE proveedor = @proveedor
    `;
    await pool.request()
      .input('proveedor', proveedor)
      .query(insertEntidadQuery);

    res.status(200).send('Proveedor replicado correctamente.');
  } catch (err) {
    console.error('Error durante la replicación del proveedor:', err);
    res.status(500).send('Error durante la replicación del proveedor.');
  }
});




app.listen(port, () => {
  console.log(`Server is running on http://192.168.25.225:${port}`);
});
