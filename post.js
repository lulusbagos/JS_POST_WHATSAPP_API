const axios = require('axios');
const sql = require('mssql');
const config = {
  user: 'xxxxx',
  password: 'xxxx',
  server: 'xxxx',
  database: 'xxxx',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

const sendWhatsappMessage = async () => {
  const apiUrl = 'http://localhost:8000/send-message';

  try {
    // Koneksi ke database SQL Server
    await sql.connect(config);

    while (true) {
      // Query semua pesan yang belum terkirim (status = 0)
      const result = await sql.query('SELECT id, number, message FROM [dbo].[tbl_t_send_whatsapp] WHERE status = 0');

      if (result.recordset.length > 0) {
        // Loop melalui setiap pesan yang belum terkirim
        for (const row of result.recordset) {
          const { id, number, message } = row;
          const data = new FormData();
          data.append('number', number);
          data.append('message', message);

          try {
            // Kirim pesan via API
            const response = await axios.post(apiUrl, data);
            console.log(response.data);

            // Set status message di database menjadi 1 (terkirim)
            const updateResult = await sql.query(`UPDATE [dbo].[tbl_t_send_whatsapp] SET status = 1, remarks = 'success' WHERE id = ${id}`);
            if (updateResult.rowsAffected[0] === 1) {
              console.log(`Message status updated for message with ID ${id}`);
            } else {
              console.error('Error updating message status');
            }
          } catch (error) {
            // Jika terjadi error, set status message di database menjadi 2 (gagal)
            console.error(error);
            const updateResult = await sql.query(` UPDATE [dbo].[tbl_t_send_whatsapp] SET status = 2, remarks = 'Error sending message: ${error.message}' WHERE id = ${id}
          `);
            if (updateResult.rowsAffected[0] === 1) {
              console.log(`Message status updated for message with ID ${id}`);
            } else {
              console.error('Error updating message status');
            }
          }
        }
      } else {
        console.log('No messages found');
      }

      // Tunggu 10 detik sebelum mencoba mengirim pesan berikutnya
      await new Promise(resolve => setTimeout(resolve, 10 * 1000));
    }

  } catch (error) {
    console.error(error);
  } finally {
    // Tutup koneksi database
    sql.close();
  }
};

sendWhatsappMessage();
