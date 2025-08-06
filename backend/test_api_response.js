const pool = require('./db');

async function testDashboardAPI() {
  const client = await pool.connect();
  try {
    console.log('🔍 Testimi i dashboard API...');
    
    // Simulate the dashboard API logic
    const getCurrentWeekLabel = () => {
      const today = new Date();
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const mondayStr = monday.toISOString().slice(0, 10);
      const sundayStr = sunday.toISOString().slice(0, 10);
      return `${mondayStr} - ${sundayStr}`;
    };

    const thisWeek = getCurrentWeekLabel();
    console.log('📅 Current week:', thisWeek);
    
    // Check if we have data for current week
    const paidThisWeek = await client.query(
      `SELECT COALESCE(SUM(gross_amount),0) as total_gross FROM payments WHERE week_label = $1 AND is_paid = true`,
      [thisWeek]
    );
    
    let weekToUse = thisWeek;
    let hasCurrentWeekData = parseFloat(paidThisWeek.rows[0].total_gross || 0) > 0;
    
    if (!hasCurrentWeekData) {
      console.log('⚠️ No data for current week, looking for recent weeks...');
      const recentWeeksRes = await client.query(
        `SELECT DISTINCT week_label FROM payments WHERE is_paid = true ORDER BY week_label DESC LIMIT 5`
      );
      
      if (recentWeeksRes.rows.length > 0) {
        weekToUse = recentWeeksRes.rows[0].week_label;
        console.log('✅ Using week:', weekToUse);
      }
    }
    
    // Get paid payments for the week
    const paidThisWeekRes = await client.query(`
      SELECT p.*, e.first_name, e.last_name, e.hourly_rate, e.label_type
      FROM payments p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.week_label = $1 AND p.is_paid = true
    `, [weekToUse]);
    
    // Get work hours for the week
    const workHoursThisWeekRes = await client.query(`
      SELECT wh.*, e.first_name, e.last_name, e.hourly_rate, c.site_name
      FROM work_hours wh
      JOIN employees e ON wh.employee_id = e.id
      JOIN contracts c ON wh.contract_id = c.id
      WHERE wh.date >= $1 AND wh.date <= $2
      ORDER BY wh.employee_id, wh.date
    `, [weekToUse.split(' - ')[0], weekToUse.split(' - ')[1]]);
    
    // Calculate totals
    const totalPaid = paidThisWeekRes.rows.reduce((sum, p) => sum + parseFloat(p.gross_amount || 0), 0);
    const totalHours = workHoursThisWeekRes.rows.reduce((sum, wh) => sum + parseFloat(wh.hours || 0), 0);
    
    console.log('💰 Total paid for week:', totalPaid);
    console.log('⏰ Total hours for week:', totalHours);
    console.log('📊 Number of payments:', paidThisWeekRes.rows.length);
    console.log('📊 Number of work hours records:', workHoursThisWeekRes.rows.length);
    
    // Get top 5 employees
    const top5PaidRes = await client.query(`
      SELECT p.employee_id, e.first_name, e.last_name, e.photo, u.role, p.gross_amount, p.is_paid
      FROM payments p
      JOIN employees e ON p.employee_id = e.id
      LEFT JOIN users u ON u.employee_id = e.id
      WHERE p.week_label = $1 AND p.is_paid = true
      ORDER BY p.gross_amount DESC
      LIMIT 5
    `, [weekToUse]);
    
    console.log('👥 Top 5 employees count:', top5PaidRes.rows.length);
    top5PaidRes.rows.forEach((emp, i) => {
      console.log(`  ${i + 1}. ${emp.first_name} ${emp.last_name}: £${parseFloat(emp.gross_amount || 0).toFixed(2)}`);
    });
    
    // Simulate the response structure
    const response = {
      thisWeek: weekToUse,
      totalHoursThisWeek: totalHours,
      totalGrossThisWeek: totalPaid,
      totalPaid: totalPaid,
      totalWorkHours: totalHours,
      top5Employees: top5PaidRes.rows.map(p => ({
        id: p.employee_id,
        name: `${p.first_name} ${p.last_name}`,
        grossAmount: parseFloat(p.gross_amount || 0),
        isPaid: p.is_paid,
        photo: p.photo || null,
        role: p.role || ''
      }))
    };
    
    console.log('\n📋 Final response structure:');
    console.log('  totalHoursThisWeek:', response.totalHoursThisWeek);
    console.log('  totalGrossThisWeek:', response.totalGrossThisWeek);
    console.log('  totalPaid:', response.totalPaid);
    console.log('  totalWorkHours:', response.totalWorkHours);
    console.log('  top5Employees.length:', response.top5Employees.length);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testDashboardAPI();