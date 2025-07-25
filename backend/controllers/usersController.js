const pool = require('../db');

exports.getAllUsers = async (req, res) => {
  try {
    if (req.query.employee_id) {
      const result = await pool.query('SELECT * FROM users WHERE employee_id = $1', [req.query.employee_id]);
      return res.json(result.rows);
    }
    const result = await pool.query('SELECT id, email, role, created_at FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT id, email, role, employee_id, first_name, last_name, created_at FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createUser = async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO users (email, password, role)
      VALUES ($1, $2, $3) RETURNING id, email, role`,
      [email, password, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { password, role } = req.body;
  try {
    const updates = [];
    const values = [];
    let index = 1;

    if (password) {
      updates.push(`password = $${index}`);
      values.push(password); // PA HASH
      index++;
    }
    if (role) {
      updates.push(`role = $${index}`);
      values.push(role);
      index++;
    }

    values.push(id);
    const result = await pool.query(`
      UPDATE users SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${index} RETURNING id, email, role`,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addUser = async (req, res) => {
  try {
    const {
      email,
      password,
      role,
      employee_id,
      first_name,
      last_name
    } = req.body;

    // Kontrollo nëse ekziston email-i
    const emailCheck = await pool.query(
      `SELECT 1 FROM users WHERE email = $1`,
      [email]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: "Ky email ekziston tashmë!" });
    }

    // Shto user-in (password default 12345678 nëse nuk jepet nga forma) - PA HASH
    const userRes = await pool.query(
      `INSERT INTO users
      (email, password, role, employee_id, first_name, last_name, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *`,
      [email, password || "12345678", role, employee_id, first_name, last_name]
    );
    const user = userRes.rows[0];

    res.status(201).json(user);
  } catch (err) {
    console.error("Gabim gjatë shtimit të user-it:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email mungon!' });
  try {
    // Hiq hash-in, vendos password-in si plain text
    const result = await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE email = $2 RETURNING id, email, role',
      ['123456789', email]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Përdoruesi nuk u gjet!' });
    }
    res.json({ message: 'Fjalëkalimi u rivendos me sukses!', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  const { id } = req.params;
  const { current_password, new_password } = req.body;
  
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Fjalëkalimi aktual dhe i ri janë të detyrueshëm!' });
  }

  try {
    // Merr fjalëkalimin aktual të përdoruesit
    const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Përdoruesi nuk u gjet!' });
    }

    const user = userResult.rows[0];
    
    // Kontrollo nëse fjalëkalimi aktual është i saktë
    if (user.password !== current_password) {
      return res.status(400).json({ error: 'Fjalëkalimi aktual është i gabuar!' });
    }

    // Përditëso fjalëkalimin e ri - PA HASH
    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [new_password, id]
    );

    res.json({ message: 'Fjalëkalimi u ndryshua me sukses!' });
  } catch (err) {
    console.error('Gabim gjatë ndryshimit të fjalëkalimit:', err);
    res.status(500).json({ error: err.message });
  }
};
