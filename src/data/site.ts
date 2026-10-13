export const site = {
  name: 'Cindy Ly',
  role: 'Product Designer',
  title: 'Cindy Ly | Product Designer',
  description:
    'Product designer crafting experiences with emotional resonance. Master of HCI + Design from UW, previously product design at Zendesk. Open to full-time roles.',
  email: 'cindykimly@gmail.com',
  links: {
    linkedin: 'https://linkedin.com/in/cindy-k-ly/',
    resume:
      'https://drive.google.com/file/d/1b8yyN0Z8tXkYLakjVOsYQzEKLJM31PET/view?usp=sharing',
    uw: 'https://mhcid.washington.edu/',
    zendesk: 'https://www.zendesk.com/',
  },
  updated: '10/26',
};

export const works = [
  {
    slug: 'reddit',
    href: '/work/reddit',
    company: 'Reddit',
    title: 'Showing Signs of Life',
    icon: '/assets/images/reddit_icon.png',
    preview: 'reel',
    badge: { kind: 'building' as const, label: 'Building' },
  },
  {
    slug: 'neuralyfe',
    href: '/work/neuralyfe',
    company: 'FigBuild 2026',
    title: 'NeuraLyfe',
    icon: '/assets/images/figma_icon.png',
    preview: 'video',
    poster: '/assets/images/neuralyfe_thumbnail.webp',
    video: '/assets/neuralyfe/neuralyfe_reel.mp4',
    tone: 'navy',
    badge: { kind: 'award' as const, label: '🏆 1st Place' },
  },
  {
    slug: 'polimeter',
    href: '/work/polimeter',
    company: 'Digital Society Lab',
    title: 'Polimeter',
    icon: '/assets/images/dsl_icon.png',
    iconClass: 'dsl',
    preview: 'video',
    poster: '/assets/images/polimeter_thumbnail.webp',
    video: '/assets/polimeter/polimeter_reel.mp4',
    tone: 'green',
    badge: { kind: 'shipped' as const, label: 'Shipped' },
  },
  {
    slug: 'zendesk',
    href: '/work/zendesk',
    company: 'Zendesk',
    title: 'Making Usage Visible',
    icon: '/assets/images/zendesk_icon.png',
    preview: 'video',
    poster: '/assets/images/zendesk_thumbnail_v2.webp',
    video: '/assets/zendesk/zendesk_reel.mp4',
    tone: 'sand',
    badge: { kind: 'shipped' as const, label: 'Shipped' },
  },
];

export type QuestTile = {
  id: string;
  label: string;
  file: string;
  wide?: boolean;
  span?: '1' | '2' | '3';
  bleed?: boolean;
  phone?: boolean;
  outline?: boolean;
  media: { kind: 'video' | 'image'; src: string; width: number; height: number };
};

export const questTiles: QuestTile[] = [
  { id: '6', label: 'Chrysalis', file: 'chrysalis.3d', wide: true, bleed: true, media: { kind: 'video', src: '/assets/images/wings_showcase.mp4', width: 1280, height: 720 } },
  { id: '12', label: 'Rediscover', file: 'rediscover.app', span: '3', phone: true, outline: true, media: { kind: 'video', src: '/assets/images/rediscover_web.mp4', width: 698, height: 1520 } },
  { id: '5', label: 'Prosperity Bag', file: 'handbag.3d', span: '1', media: { kind: 'image', src: '/assets/images/handbag_thumbnail.webp', width: 2182, height: 2182 } },
  { id: '2', label: 'Nimbus', file: 'nimbus.ai', span: '2', phone: true, media: { kind: 'video', src: '/assets/images/nimbus_demo_web.mp4', width: 710, height: 1538 } },
  { id: '8', label: 'Config 2026 Recap', file: 'config.mp4', span: '1', bleed: true, media: { kind: 'video', src: '/assets/images/config_recap_web.mp4', width: 800, height: 1080 } },
  { id: '11', label: 'Merch Editor', file: 'editor.app', span: '2', media: { kind: 'video', src: '/assets/images/mod_editor_web.mp4', width: 1012, height: 720 } },
  { id: '9', label: 'Ra~View', file: 'raview.app', span: '3', phone: true, media: { kind: 'video', src: '/assets/images/Ra-View.mp4', width: 556, height: 1204 } },
  { id: '10', label: 'Analytics Dashboard', file: 'sales.app', span: '1', media: { kind: 'video', src: '/assets/images/mod_analytics.mp4', width: 920, height: 720 } },
  { id: '1', label: 'Mangosteen Lamp', file: 'lamp.3d', span: '2', media: { kind: 'image', src: '/assets/images/lamp_off.webp', width: 1850, height: 1850 } },
  { id: '3', label: 'The Way the Cookie Crumbles', file: 'cookies.pdf', span: '3', media: { kind: 'image', src: '/assets/images/cookies.webp', width: 1700, height: 2200 } },
];

export const stickers = [
  { key: 'matcha', src: '/assets/stickers/matcha_sticker.png', label: 'matcha sticker' },
  { key: 'kitty', src: '/assets/stickers/kitty_sticker.png', label: 'kitty sticker' },
  { key: 'nigiri', src: '/assets/stickers/nigiri_sticker.png', label: 'nigiri sticker' },
  { key: 'cn', src: '/assets/stickers/cn_sticker.png', label: 'cn tower sticker', tall: true },
  { key: 'bow', src: '/assets/stickers/bow_sticker.png', label: 'bow sticker' },
  { key: 'vietnam', src: '/assets/stickers/vietnam_sticker.png', label: 'vietnam sticker' },
  { key: 'fish', src: '/assets/images/goldfish.png', label: 'goldfish sticker' },
];

export const todos = [
  { text: 'redesign my portfolio', done: true },
  { text: 'resist the urge to redesign it again', done: false },
  { text: "map every place I've cried in grad school", done: false },
  { text: "keep building things I'm not sure will work", done: false },
];
