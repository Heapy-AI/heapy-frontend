// 작성자: 김진우 — APK에서 추출한 원본 코디 이미지를 사용한다.
import { ImageSourcePropType } from 'react-native';

export const baseCat = require('../../assets/shop/cat.png');
export const shopAssets: Record<
  string,
  { item: ImageSourcePropType; cat: ImageSourcePropType }
> = {
  'blue-cap': {
    item: require('../../assets/shop/items/blue-cap.png'),
    cat: require('../../assets/shop/outfits/blue-cap.png'),
  },
  'yellow-backpack': {
    item: require('../../assets/shop/items/yellow-backpack.png'),
    cat: require('../../assets/shop/outfits/yellow-backpack.png'),
  },
  'purple-hoodie': {
    item: require('../../assets/shop/items/purple-hoodie.png'),
    cat: require('../../assets/shop/outfits/purple-hoodie.png'),
  },
  'orange-scarf': {
    item: require('../../assets/shop/items/orange-scarf.png'),
    cat: require('../../assets/shop/outfits/orange-scarf.png'),
  },
};
