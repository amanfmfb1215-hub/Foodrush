const Promise = require('node:timers/promises');
const ids = [
  '1517248135467-4c7edcad34c4',
  '1508215885820-4585e56109f8',
  '1590846406792-0adc7f928a1f',
  '1528605248644-14dd04022da1',
  '1505253716362-afaea1d3d1af',
  '1605335520863-1250266dd1d0',
  '1565557623262-b51c2513a641',
  '1585408985551-787fe68ea38a',
  '1513558161293-cdaf765ed2fd',
  '1589301760014-d929f3979dbc'
];
async function check() {
  for (const id of ids) {
    try {
      const res = await fetch(`https://images.unsplash.com/photo-${id}?w=10`);
      console.log(id, res.status);
    } catch {}
  }
}
check();
