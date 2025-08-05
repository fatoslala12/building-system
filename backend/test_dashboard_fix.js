const pool = require('./db');

async function testDashboardFix() {
  const client = await pool.connect();
  try {
    console.log('🔍 Testimi i dashboard fix...');
    
    // Test the current week calculation
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const thisWeek = `${monday.toISOString().slice(0, 10)} - ${sunday.toISOString().slice(0, 10)}`;
    
    console.log('📅 Current week label:', thisWeek);
    console.log('📅 Today:', today.toISOString().slice(0, 10));
    
    // Check if there's data for current week
    const currentWeekData = await client.query(
      'SELECT COUNT(*) as count FROM payments WHERE week_label = $1 AND is_paid = true',
      [thisWeek]
    );
    console.log('💰 Current week payments:', currentWeekData.rows[0].count);
    
    // Check for recent weeks with data
    const recentWeeks = await client.query(
      'SELECT DISTINCT week_label FROM payments WHERE is_paid = true ORDER BY week_label DESC LIMIT 5'
    );
    console.log('📊 Recent weeks with data:', recentWeeks.rows.map(r => r.week_label));
    
    // Check work hours for current week
    const workHoursData = await client.query(
      'SELECT COUNT(*) as count FROM work_hours WHERE date >= $1 AND date <= $2',
      [thisWeek.split(' - ')[0], thisWeek.split(' - ')[1]]
    );
    console.log('⏰ Work hours this week:', workHoursData.rows[0].count);
    
    // Check total payments
    const totalPayments = await client.query(
      'SELECT COALESCE(SUM(gross_amount), 0) as total FROM payments WHERE is_paid = true'
    );
    console.log('💷 Total payments in system:', parseFloat(totalPayments.rows[0].total || 0));
    
    // Check total work hours
    const totalWorkHours = await client.query(
      'SELECT COALESCE(SUM(hours), 0) as total FROM work_hours'
    );
    console.log('⏰ Total work hours in system:', parseFloat(totalWorkHours.rows[0].total || 0));
    
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testDashboardFix();