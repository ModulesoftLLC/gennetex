const posts = [
  {
    id: 'demo-1',
    title: 'Гол түүх: Цахим шинэчлэлийн үр дүн',
    slug: 'gol-tuh-1',
    excerpt: 'Цахимчлал нь олон салбарын үйл ажиллагааг хэрхэн өөрчилж байгааг тоймлов.',
    content: `
      <p>Энэ бол жишээ нийтлэл юм. Агуулга нь маш богино жишээ текст бөгөөд Mongolian хэл дээр бичигдсэн.</p>
      <p>Илүү гүнзгий тайлбар, ишлэлийг доод хэсэгт оруулна.</p>
    `,
    featured_image: 'https://images.unsplash.com/photo-1508873535684-277a3cbcc9b4?w=1400&auto=format&fit=crop&q=80',
    author: 'Automated',
    created_at: '2026-07-23',
    published: true,
    source_urls: ['https://example.com/article1']
  },
  {
    id: 'demo-2',
    title: 'Технологи ба боловсрол: Шинэ боломж',
    slug: 'technology-bolovsrol',
    excerpt: 'Сургалт, боловсролын орчинд технологи хэрхэн туслаж байгааг судлав.',
    content: `
      <p>Технологийн нөлөө боловсролд хэрхэн нөлөөлж байгааг жишээгээр тайлбарлав.</p>
    `,
    featured_image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1400&auto=format&fit=crop&q=80',
    author: 'Automated',
    created_at: '2026-07-22',
    published: true,
    source_urls: ['https://example.com/article2']
  },
  {
    id: 'demo-3',
    title: 'Эдийн засгийн тойм: Ойрын ирээдүй',
    slug: 'ediin-zasag-toim',
    excerpt: 'Ойрын хугацаанд болох гол өөрчлөлтүүдийг тоймолж байна.',
    content: `
      <p>Энэхүү нийтлэлд эдийн засгийн гол чиг хандлагуудыг товч тоочсон.</p>
    `,
    featured_image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=1400&auto=format&fit=crop&q=80',
    author: 'Automated',
    created_at: '2026-07-21',
    published: true,
    source_urls: ['https://example.com/article3']
  },
  {
    id: 'demo-4',
    title: 'Дээд зэрэглэл: Эрүүл мэндийн инноваци',
    slug: 'eruul-mend-innovation',
    excerpt: 'Эрүүл мэндийн салбар дахь хамгийн сүүлийн инновацууд.',
    content: `
      <p>Эрүүл мэндийн шинэ технологи, үйлчилгээний загваруудын тойм.</p>
    `,
    featured_image: 'https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?w=1400&auto=format&fit=crop&q=80',
    author: 'Automated',
    created_at: '2026-07-20',
    published: true,
    source_urls: ['https://example.com/article4']
  },
  {
    id: 'demo-5',
    title: 'Орон нутгийн мэдээ: Хотын шинэ төсөл',
    slug: 'hotin-shine-tosol',
    excerpt: 'Хотын захиргаа шинэ төсөл танилцуулж байна.',
    content: `
      <p>Орон нутгийн шинэхэн төслийн товч танилцуулга.</p>
    `,
    featured_image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1400&auto=format&fit=crop&q=80',
    author: 'Automated',
    created_at: '2026-07-19',
    published: true,
    source_urls: ['https://example.com/article5']
  }
];

export default posts;
