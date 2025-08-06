const pool = require('./db');

async function testDashboardFinal() {
  const client = await pool.connect();
  try {
    console.log('🔍 Final Dashboard Test...');
    
    // Get current week
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const thisWeek = `${monday.toISOString().slice(0, 10)} - ${sunday.toISOString().slice(0, 10)}`;
    
    console.log('📅 Current week:', thisWeek);
    
    // Get all paid payments for this week
    const paymentsRes = await client.query(`
      SELECT p.*, e.first_name, e.last_name, e.hourly_rate
      FROM payments p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.week_label = $1 AND p.is_paid = true
      ORDER BY p.gross_amount DESC
    `, [thisWeek]);
    
    const totalPaid = paymentsRes.rows.reduce((sum, p) => sum + parseFloat(p.gross_amount || 0), 0);
    console.log('💰 Total paid this week:', totalPaid);
    console.log('📊 Number of payments:', paymentsRes.rows.length);
    
    // Get work hours for this week
    const workHoursRes = await client.query(`
      SELECT SUM(hours) as total_hours
      FROM work_hours
      WHERE date >= $1 AND date <= $2
    `, [thisWeek.split(' - ')[0], thisWeek.split(' - ')[1]]);
    
    const totalHours = parseFloat(workHoursRes.rows[0].total_hours || 0);
    console.log('⏰ Total hours this week:', totalHours);
    
    // Get top 5 employees
    const top5Res = await client.query(`
      SELECT p.employee_id, e.first_name, e.last_name, p.gross_amount
      FROM payments p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.week_label = $1 AND p.is_paid = true
      ORDER BY p.gross_amount DESC
      LIMIT 5
    `, [thisWeek]);
    
    console.log('👥 Top 5 employees:');
    top5Res.rows.forEach((emp, i) => {
      console.log(`  ${i + 1}. ${emp.first_name} ${emp.last_name}: £${parseFloat(emp.gross_amount || 0).toFixed(2)}`);
    });
    
    // Simulate the expected response
    const expectedResponse = {
      thisWeek: thisWeek,
      totalHoursThisWeek: totalHours,
      totalGrossThisWeek: totalPaid,
      totalPaid: totalPaid,
      totalWorkHours: totalHours,
      top5Employees: top5Res.rows.map(p => ({
        id: p.employee_id,
        name: `${p.first_name} ${p.last_name}`,
        grossAmount: parseFloat(p.gross_amount || 0),
        isPaid: true
      }))
    };
    
    console.log('\n📋 Expected Frontend Values:');
    console.log('  "Orë të punuara këtë javë":', expectedResponse.totalHoursThisWeek, 'orë');
    console.log('  "Total Bruto": £' + expectedResponse.totalGrossThisWeek.toFixed(2));
    console.log('  "Top 5 employees":', expectedResponse.top5Employees.length, 'employees');
    
    if (expectedResponse.totalGrossThisWeek > 0) {
      console.log('✅ Dashboard should show real values!');
    } else {
      console.log('❌ Dashboard will still show £0.00');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testDashboardFinal();