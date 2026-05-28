const urls = {
  easypaisa: 'https://kommodo.ai/i/rPpWlM20xmxdNEvKK46K',
  jazzcash: 'https://kommodo.ai/i/nL9HP7ecOENYxBNKXZvg',
  hbl: 'https://kommodo.ai/i/eqoB2lmRhOImubHZWWjF',
  meezan: 'https://kommodo.ai/i/EpmsfeQFibzbgtVVRdNg',
  ubl: 'https://kommodo.ai/i/qzvieLpnKlRqyPy8blpm',
  mcb: 'https://kommodo.ai/i/Q97lU30isU90YpxSiEk3',
  allied: 'https://kommodo.ai/i/MrX43DkVF2nEwH0RzePu',
  alfalah: 'https://kommodo.ai/i/YecBMF8T32GYj7Sdd0sP'
};

async function run() {
  for (const [key, url] of Object.entries(urls)) {
    const res = await fetch(url);
    const text = await res.text();
    const ogMatch = text.match(/<meta[^>]+property="og:image"[^>]+content="([^">]+)"/);
    console.log(key, ogMatch ? ogMatch[1] : url);
  }
}
run();
