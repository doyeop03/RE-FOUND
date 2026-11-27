import type { StaticImageData } from "next/image";
import boaFleeceJacket from "@/assets/products/boa-fleece-jacket.jpg";
import corduroyPocketShirt from "@/assets/products/corduroy-pocket-shirt.jpg";
import corduroyShirt from "@/assets/products/corduroy-shirt.jpg";
import coverall from "@/assets/products/coverall.jpg";
import denimCoverall from "@/assets/products/denim-coverall.jpg";
import denimTruckerJacket from "@/assets/products/denim-trucker-jacket.jpg";
import duffleCoat from "@/assets/products/duffle-coat.jpg";
import fleecePullover from "@/assets/products/fleece-pullover.jpg";
import italianCottonJacket from "@/assets/products/italian-cotton-jacket.jpg";
import microStripeTee from "@/assets/products/micro-stripe-tee.jpg";
import mountainParka from "@/assets/products/mountain-parka.jpg";
import ucwDenimPants from "@/assets/products/ucw-denim-pants.jpg";
import ukiyoeTee from "@/assets/products/ukiyoe-tee.jpg";

/**
 * 발견하기 카드에 쓰는 상품 사진 (판매 상품 사진).
 * 상세 화면 안쪽의 부위별 이미지는 아직 일러스트(GarmentImage)를 그대로 쓴다.
 * import 로 불러와야 GitHub Pages 의 basePath 가 경로에 붙는다.
 */
export const PRODUCT_PHOTOS: Record<string, StaticImageData> = {
  "fleece-98-zip": boaFleeceJacket,
  "lambswool-03-crew": corduroyPocketShirt,
  "oxford-07-shirt": corduroyShirt,
  "uu-16-blouson": coverall,
  "designer-17-stripe-knit": denimCoverall,
  "denim-01-trucker": denimTruckerJacket,
  "duffle-23-coat": duffleCoat,
  "fleece-00-halfzip": fleecePullover,
  "plusj-09-coat": italianCottonJacket,
  "ut-19-artist": microStripeTee,
  "m65-04-field": mountainParka,
  "selvedge-10-jeans": ucwDenimPants,
  "ut-03-graphic": ukiyoeTee,
};
