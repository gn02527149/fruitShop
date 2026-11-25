const catalogPhotos = {
  '愛文芒果': 'mango',
  '金鑽鳳梨': 'pineapple',
  '巨峰葡萄': 'grapes',
  '富士蘋果': 'apple',
  '香蕉': 'banana',
  '大湖草莓（特價）': 'strawberry',
  '西瓜': 'watermelon',
  '拉拉山水蜜桃': 'peach',
  '奇異果': 'kiwi',
  '茂谷柑': 'mandarin',
  '綜合水果箱': 'fruit-box',
};

export function productImage(product) {
  if (product.image) return product.image;
  if (!Object.hasOwn(catalogPhotos, product.name)) return '';
  return `${import.meta.env.BASE_URL}images/${catalogPhotos[product.name]}.webp`;
}
