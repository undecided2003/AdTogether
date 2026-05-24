const url = 'https://ssradtogether15453-l4lcgh7rfq-uc.a.run.app';
fetch(url)
  .then(res => {
    console.log('Status:', res.status);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    return res.text();
  })
  .then(body => {
    console.log('Body length:', body.length);
    console.log('Body:', body.substring(0, 1000));
  })
  .catch(err => {
    console.error('Error:', err);
  });
