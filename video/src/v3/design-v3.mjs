export const v3Style = {
  primaryTypography: 'serif',
  background: '#f4edde',
  paper: '#fff9ec',
  ink: '#1c1816',
  oxblood: '#8d1831',
  muted: '#71655e',
  socialCyan: '#25f4ee',
  socialCoral: '#fe2c55',
  avoidSlideDeck: true,
};

export const v3SceneAssets = {
  ecommerce: 'style-previews/editorial-social-commerce-ecommerce.png',
  catalog: 'v3-scenes/catalog-retrieval.png',
  override: 'v3-scenes/override-polyester.png',
  ads: 'v3-scenes/ads-commerce.png',
};

export const v3Chapters = [
  {id: 'problem-product', start: 0, end: 30},
  {id: 'intent-retrieval', start: 30, end: 60},
  {id: 'override-rank', start: 60, end: 100},
  {id: 'mechanism-commerce', start: 100, end: 120},
  {id: 'advertising', start: 120, end: 150},
  {id: 'evidence-close', start: 150, end: 180},
];

export const v3CaptionSafeArea = {
  left: 110,
  right: 110,
  bottom: 42,
  maxWidth: 1500,
};
