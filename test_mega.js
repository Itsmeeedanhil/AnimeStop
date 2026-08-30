async function test() {
  const res = await fetch('https://megaplays.se/e/6djsh7u9', { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  console.log('Megaplays Embed Status:', res.status);
  console.log('Megaplays Embed HTML:\n', html.slice(0, 1500));
}
test();

