const pool = require('./db');

async function fixPaymentAmounts() {
  const client = await pool.connect();
  try {
    console.log('🔧 Fixing payment amounts...');
    
    // Get all payments with null gross_amount
    const nullPayments = await client.query(`
      SELECT p.id, p.employee_id, p.week_label, p.is_paid, e.hourly_rate
      FROM payments p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.gross_amount IS NULL
      ORDER BY p.week_label DESC
    `);
    
    console.log(`📊 Found ${nullPayments.rows.length} payments with null gross_amount`);
    
    if (nullPayments.rows.length === 0) {
      console.log('✅ No payments to fix!');
      return;
    }
    
    let updatedCount = 0;
    
    for (const payment of nullPayments.rows) {
      // Get work hours for this employee and week
      const [weekStart, weekEnd] = payment.week_label.split(' - ');
      
      const workHoursRes = await client.query(`
        SELECT SUM(hours) as total_hours
        FROM work_hours
        WHERE employee_id = $1 AND date >= $2 AND date <= $3
      `, [payment.employee_id, weekStart, weekEnd]);
      
      const totalHours = parseFloat(workHoursRes.rows[0].total_hours || 0);
      const hourlyRate = parseFloat(payment.hourly_rate || 0);
      const grossAmount = totalHours * hourlyRate;
      
      console.log(`💰 Employee ${payment.employee_id}: ${totalHours}h × £${hourlyRate}/h = £${grossAmount.toFixed(2)}`);
      
      // Update the payment
      await client.query(`
        UPDATE payments 
        SET gross_amount = $1, net_amount = $2, updated_at = NOW()
        WHERE id = $3
      `, [grossAmount, grossAmount * 0.8, payment.id]); // net = 80% of gross
      
      updatedCount++;
    }
    
    console.log(`✅ Updated ${updatedCount} payments`);
    
    // Verify the fix
    const verifyRes = await client.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(gross_amount), 0) as total_gross
      FROM payments 
      WHERE week_label = '2025-08-04 - 2025-08-10' AND is_paid = true
    `);
    
    console.log('📊 Verification:');
    console.log(`  Payments count: ${verifyRes.rows[0].count}`);
    console.log(`  Total gross: £${parseFloat(verifyRes.rows[0].total_gross).toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Error fixing payments:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixPaymentAmounts();