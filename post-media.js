const sql = require('mssql');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// konfigurasi koneksi ke database MSSQL
const config = {
  user: 'xxxx',
  password: 'xxx',
  server: 'xxxxx',
  database: 'xxxx',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    servername: 'xxxxx'
  }
};

// membuat fungsi untuk menjalankan query
function runQuery(query, callback) {
  // membuat koneksi ke database
  const connection = new sql.ConnectionPool(config);
  connection.connect(err => {
    if (err) {
      console.log(err);
      connection.close();
      return;
    }

    // membuat request ke database
    const request = new sql.Request(connection);

    // menjalankan query
    request.query(query, (err, result) => {
      if (err) {
        console.log(err);
        connection.close();
        return;
      }

      // menutup koneksi dan menjalankan callback dengan hasil query
      connection.close();
      callback(result);
    });
  });
}

// menjalankan query setiap 10 detik
setInterval(() => {
  // query untuk mengambil data dari tabel
  const query = 'SELECT * FROM [DB_MID_MESSAGING].[dbo].[tbl_t_send_whatsapp] where status = 0';

  // menjalankan query
  runQuery(query, result => {
    // jika query berhasil, mengirim data ke endpoint http://localhost:8000/send-media untuk setiap baris hasil query
    for (let i = 0; i < result.recordset.length; i++) {
      const formData = new FormData();
      formData.append('number', result.recordset[i].number);
      formData.append('caption', result.recordset[i].caption);
      if (fs.existsSync(result.recordset[i].file_path)) {
        formData.append('file', fs.createReadStream(result.recordset[i].file_path));
      }

      axios.post('http://localhost:8000/send-group-media', formData, {
        headers: formData.getHeaders()
      })
      .then(response => {
        console.log(response.data);

        // Jika pengiriman berhasil, update status kolom menjadi 1
        const updateQuery = `UPDATE [DB_MID_MESSAGING].[dbo].[tbl_t_send_whatsapp] SET status = 1, remarks = 'success' WHERE id = '${result.recordset[i]['id']}'`;
        runQuery(updateQuery, updateResult => {});
      })
      .catch(error => {
        console.log(error);

        // Jika pengiriman gagal, update status kolom menjadi 2 dan remarks menjadi pesan kesalahan
        const updateQuery = `UPDATE [DB_MID_MESSAGING].[dbo].[tbl_t_send_whatsapp] SET status = 2, remarks = '${error.message.replace(/'/g, "''")}' WHERE id = '${result.recordset[i]['id']}'`;
        runQuery(updateQuery, updateResult => {});
      });
    }
  });
}, 10000);
