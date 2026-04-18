import { chromium } from 'playwright';

const test = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('=== APP TESTING ===');
  
  // Test Homepage
  console.log('\n1. Homepage');
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1500);
  const homeText = await page.textContent('body');
  console.log('   RateX Brand:', homeText.includes('RateX') ? '✅' : '❌');
  
  // Test Login Page
  console.log('\n2. Admin Login Page');
  await page.goto('http://localhost:5173/admin/login');
  await page.waitForTimeout(1500);
  const hasLoginForm = await page.isVisible('input');
  console.log('   Login Form:', hasLoginForm ? '✅' : '❌');
  
  // Check for JavaScript errors
  console.log('\n3. Checking for Errors...');
  let errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  // Test all new routes
  console.log('\n4. Testing New Routes:');
  const routes = [
    '/admin/dashboard',
    '/admin/dashboard/accounts',
    '/admin/dashboard/transactions', 
    '/admin/dashboard/card-purchases',
    '/admin/dashboard/usdt-sales'
  ];
  
  for (const route of routes) {
    await page.goto('http://localhost:5173' + route);
    await page.waitForTimeout(1000);
    const url = page.url();
    console.log('   ' + route + ':', url.includes('login') ? 'REDIRECTED (auth working)' : 'LOADED');
  }
  
  // Test login
  console.log('\n5. Testing Login:');
  await page.goto('http://localhost:5173/admin/login');
  await page.waitForTimeout(1000);
  
  try {
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    const url = page.url();
    console.log('   Login Result:', url.includes('dashboard') ? '✅ SUCCESS' : '❌ FAILED');
    
    if (url.includes('dashboard')) {
      await page.waitForTimeout(1000);
      const bodyText = await page.textContent('body');
      
      console.log('\n6. Navigation Items:');
      console.log('   Bank Accounts:', bodyText.includes('Bank Accounts') ? '✅' : '❌');
      console.log('   USDT Accounts:', bodyText.includes('USDT Accounts') ? '✅' : '❌');
      console.log('   Card Purchases:', bodyText.includes('Card Purchases') ? '✅' : '❌');
      console.log('   USDT Sales:', bodyText.includes('USDT Sales') ? '✅' : '❌');
      
      console.log('\n7. Testing USDT Pages:');
      const usdtPages = [
        '/admin/dashboard/accounts',
        '/admin/dashboard/transactions',
        '/admin/dashboard/card-purchases',
        '/admin/dashboard/usdt-sales'
      ];
      
      for (const p of usdtPages) {
        await page.goto('http://localhost:5173' + p);
        await page.waitForTimeout(1500);
        const pageText = await page.textContent('body');
        const hasContent = !pageText.includes('404') && !pageText.includes('Error');
        console.log('   ' + p + ':', hasContent ? '✅' : '❌');
      }
    }
  } catch (e) {
    console.log('   Login test error:', e.message);
  }
  
  if (errors.length > 0) {
    console.log('\n⚠️ Console Errors:');
    errors.slice(0, 5).forEach(e => console.log('   -', e.substring(0, 80)));
  } else {
    console.log('\n✅ No critical JavaScript errors!');
  }
  
  await browser.close();
  console.log('\n=== TEST COMPLETE ===');
};

test();
