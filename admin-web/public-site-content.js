/**
 * Public вэбсайтын текст — админ засварлах
 */
(function (global) {
  var DEFAULT_PUBLIC_SITE_CONTENT = {
    navbar: {
      brand: 'ЖЕННЕТЕКС',
      ctaCareers: 'Ажилд орох',
      links: [
        { to: '/about', label: 'Бидний тухай' },
        { to: '/services', label: 'Үйлчилгээ' },
        { to: '/projects', label: 'Төслүүд' },
        { to: '/careers', label: 'Ажлын байр' },
        { to: '/contact', label: 'Холбоо барих' },
      ],
    },
    hero: {
      stat1: '10+ жилийн туршлага',
      stat2: '500+ төсөл',
      stat3: '24/7 дэмжлэг',
      badge: 'ЖЕННЕТЕКС ХХК',
      title1: 'Илүү ухаалгаар.',
      title2: 'Илүү хурдан.',
      description:
        'Сүлжээ, шилэн кабель, CCTV болон IT дэд бүтцийн иж бүрэн шийдлийг Монголын бизнесүүдэд хүргэдэг инженерингийн компани.',
      tagline: '«Холбоо — итгэлцлийн суурь»',
      btnServices: 'Үйлчилгээ үзэх',
      btnAbout: 'Дэлгэрэнгүй',
      btnContact: 'Холбогдох',
      btnCareers: 'Ажилд орох',
    },
    home: {
      label: 'Хуудаснууд',
      title: 'Манай вэбсайтын хэсгүүд',
      linkOpen: 'Нээх',
      links: [
        { to: '/about', title: 'Бидний тухай', text: 'Зорилго, үнэт зүйлс, мэргэжлийн багийн танилцуулга.' },
        { to: '/services', title: 'Үйлчилгээ', text: 'Сүлжээ, шилэн кабель, CCTV, сервер өрөөний шийдэл.' },
        { to: '/projects', title: 'Төслүүд', text: 'Хэрэгжүүлсэн ажлууд, харилцагчдын итгэл.' },
        { to: '/careers', title: 'Ажлын байр', text: 'Ажилд орох албан ёсны анкет бөглөх.' },
        { to: '/contact', title: 'Холбоо барих', text: 'Утас, имэйл, хаяг, холбоо барих маягт.' },
      ],
    },
    about: {
      label: 'Бидний тухай',
      title: 'Найдвартай технологийн түнш',
      intro:
        'Бид орчин үеийн технологи, туршлагатай инженерүүдийн багаараа дамжуулан байгууллагуудын дижитал шилжилтийг дэмжиж, тасралтгүй аюулгүй үйл ажиллагааг хангадаг.',
      items: [
        { title: 'Эрхэм зорилго', text: 'Чанартай, найдвартай технологийн шийдлээр харилцагчдынхаа өсөлтөд хувь нэмэр оруулах.' },
        { title: 'Мэргэжлийн баг', text: 'Гэрчилгээжсэн, тасралтгүй хөгжиж буй инженерүүдийн туршлагатай хамт олон.' },
        { title: 'Хариуцлага', text: 'Төслийн эхнээс дуустал, дараах засвар үйлчилгээ хүртэл бүрэн хариуцлага.' },
      ],
    },
    services: {
      label: 'Үйлчилгээ',
      title: 'Бидний санал болгодог шийдлүүд',
      items: [
        { title: 'Сүлжээний шийдэл', text: 'LAN/WAN, өгөгдлийн төв, wireless сүлжээний зураг төсөл, суурилуулалт.' },
        { title: 'Шилэн кабель', text: 'Fiber optic татах, гагнах, хэмжилт, терминаци болон бүрэн шинжилгээ.' },
        { title: 'Хяналтын систем', text: 'CCTV, хяналт-камер, хандалт удирдлагын иж бүрэн систем.' },
        { title: 'Аюулгүй байдал', text: 'Гал хамгаалалт, дохиолол, мэдээллийн аюулгүй байдлын шийдэл.' },
        { title: 'IT дэд бүтэц', text: 'Сервер, өгөгдлийн төв, виртуалчлал, дэд бүтцийн зөвлөгөө.' },
        { title: 'Техник үйлчилгээ', text: '24/7 хяналт, урьдчилан сэргийлэх засвар, шуурхай дэмжлэг.' },
      ],
    },
    projects: {
      label: 'Төслүүд',
      title: 'Бидний хүрсэн үр дүн',
      highlightsTitle: 'Гол чиглэлүүд',
      stats: [
        { value: '10+', label: 'Жилийн туршлага' },
        { value: '500+', label: 'Хэрэгжүүлсэн төсөл' },
        { value: '50+', label: 'Мэргэжлийн инженер' },
        { value: '24/7', label: 'Техник дэмжлэг' },
      ],
      highlights: [
        'Байгууллагын сүлжээний бүрэн шинэчлэл, өндөр хурдны шилэн холболт',
        'Оффис, агуулах, үйлдвэрлэлийн талбайн CCTV болон хяналтын систем',
        'Төслийн эхнээс дуустал инженерийн хяналт, гүйцэтгэлийн баталгаа',
      ],
    },
    contact: {
      label: 'Холбоо барих',
      title: 'Бидэнтэй холбогдоорой',
      address: 'Улаанбаатар хот, Монгол улс',
      phone: '+976 0000-0000',
      phoneHref: 'tel:+97600000000',
      email: 'info@adiya.site',
      emailHref: 'mailto:info@adiya.site',
      website: 'adiya.site',
      hoursTitle: 'Ажлын цаг',
      hoursWeekday: 'Даваа – Баасан: 09:00 – 18:00',
      hoursSaturday: 'Бямба: 10:00 – 14:00',
      hoursSunday: 'Ням: Амарна',
      hoursNote: 'Яаралтай техник дэмжлэг 24/7 ажиллана.',
    },
    careers: {
      label: 'Ажлын байр',
      title: 'Ажилд орох анкет',
      intro:
        '"ЖЕННЕТЕКС" ХХК-ийн албан ёсны ажилд орох анкетыг доор бөглөн илгээнэ үү. Бөглөсөн мэдээлэл шууд хүний нөөцийн багт очно.',
      pageIntro: 'ЖЕННЕТЕКС ХХК-ийн албан ёсны анкетыг бөглөнө үү. Бүх талбарыг үнэн зөв бөглөнө.',
      perksTitle: 'Мэдээлэл',
      perks: ['Инженерийн мэргэжлийн баг', 'Тогтвортой ажлын байр', 'Нийгмийн даатгал'],
      sidebarNote:
        'Анкет илгээсний дараа HR баг хянаж, утсаар холбогдоно. Хувийн мэдээллийг зөвхөн ажилд авах зорилгоор ашиглана.',
      footer: '© {year} ЖЕННЕТЕКС ХХК',
      backHome: 'Нүүр',
      backShort: 'Буцах',
    },
    footer: {
      brand: 'ЖЕННЕТЕКС',
      copyright: '© {year} Gennetex. Бүх эрх хуулиар хамгаалагдсан.',
    },
  };

  function deepMerge(base, patch) {
    if (!patch || typeof patch !== 'object') return base;
    if (Array.isArray(patch)) {
      return patch.map(function (item, i) {
        return typeof item === 'object' && item && base && base[i] ? deepMerge(base[i], item) : item;
      });
    }
    var out = Object.assign({}, base);
    Object.keys(patch).forEach(function (key) {
      var value = patch[key];
      if (value === undefined) return;
      if (Array.isArray(value)) out[key] = value;
      else if (value && typeof value === 'object' && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
        out[key] = deepMerge(out[key], value);
      } else out[key] = value;
    });
    return out;
  }

  function mergePublicSiteContent(partial) {
    return deepMerge(DEFAULT_PUBLIC_SITE_CONTENT, partial || {});
  }

  function esc(v) {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function field(label, id, value, opts) {
    opts = opts || {};
    var val = esc(value);
    if (opts.area) {
      return (
        '<label class="psc-field"><span class="psc-label">' +
        esc(label) +
        '</span><textarea id="' +
        id +
        '" rows="' +
        (opts.rows || 3) +
        '">' +
        val +
        '</textarea></label>'
      );
    }
    return (
      '<label class="psc-field"><span class="psc-label">' +
      esc(label) +
      '</span><input id="' +
      id +
      '" type="text" value="' +
      val +
      '"/></label>'
    );
  }

  function itemPairFields(prefix, title, text, i) {
    return (
      '<div class="psc-item"><div class="psc-item-title">#' +
      (i + 1) +
      '</div>' +
      field('Гарчиг', prefix + '_title_' + i, title) +
      field('Текст', prefix + '_text_' + i, text, { area: true, rows: 2 }) +
      '</div>'
    );
  }

  function renderPublicSiteEditorHtml(content, updatedAt) {
    var c = content || DEFAULT_PUBLIC_SITE_CONTENT;
    var h = c.hero || {};
    var hm = c.home || {};
    var ab = c.about || {};
    var sv = c.services || {};
    var pj = c.projects || {};
    var ct = c.contact || {};
    var cr = c.careers || {};
    var ft = c.footer || {};
    var nb = c.navbar || {};
    var updated = updatedAt ? new Date(updatedAt).toLocaleString('mn-MN') : '—';

    var aboutItems = (ab.items || []).map(function (it, i) {
      return itemPairFields('about', it.title, it.text, i);
    }).join('');
    var serviceItems = (sv.items || []).map(function (it, i) {
      return itemPairFields('service', it.title, it.text, i);
    }).join('');
    var homeLinks = (hm.links || []).map(function (it, i) {
      return (
        '<div class="psc-item"><div class="psc-item-title">Холбоос #' +
        (i + 1) +
        '</div>' +
        field('Гарчиг', 'home_link_title_' + i, it.title) +
        field('Текст', 'home_link_text_' + i, it.text, { area: true, rows: 2 }) +
        '</div>'
      );
    }).join('');
    var stats = (pj.stats || []).map(function (s, i) {
      return (
        '<div class="psc-item"><div class="psc-item-title">Статистик #' +
        (i + 1) +
        '</div>' +
        field('Утга', 'proj_stat_value_' + i, s.value) +
        field('Шошго', 'proj_stat_label_' + i, s.label) +
        '</div>'
      );
    }).join('');
    var highlights = (pj.highlights || [])
      .map(function (line, i) {
        return field('Мөр #' + (i + 1), 'proj_highlight_' + i, line, { area: true, rows: 2 });
      })
      .join('');
    var navLinks = (nb.links || [])
      .map(function (l, i) {
        return field('Цэс #' + (i + 1), 'nav_link_' + i, l.label);
      })
      .join('');
    var perks = (cr.perks || [])
      .map(function (p, i) {
        return field('Давуу тал #' + (i + 1), 'career_perk_' + i, p);
      })
      .join('');

    return (
      '<style>.psc-wrap{display:grid;gap:16px}.psc-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:4px}.psc-tab{border:1px solid var(--line);background:var(--card);color:var(--text);padding:8px 14px;border-radius:999px;font-size:13px;cursor:pointer}.psc-tab.active{background:var(--accent);color:#fff;border-color:var(--accent)}.psc-panel{display:none}.psc-panel.active{display:block}.psc-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}.psc-field{display:flex;flex-direction:column;gap:6px}.psc-label{font-size:12px;color:var(--muted)}.psc-field input,.psc-field textarea{width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--text);font:inherit;font-size:14px}.psc-item{border:1px solid var(--line);border-radius:12px;padding:12px;background:var(--card)}.psc-item-title{font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:8px}</style>' +
      '<div class="psc-wrap">' +
      '<p class="muted" style="margin:0;font-size:13px">Сүүлд хадгалсан: <b>' +
      esc(updated) +
      '</b> · Өөрчлөлт нь <a href="/" target="_blank" rel="noopener">public вэб</a> дээр шууд харагдана.</p>' +
      '<div class="psc-tabs" id="pscTabs">' +
      ['hero', 'home', 'about', 'services', 'projects', 'contact', 'careers', 'navbar', 'footer']
        .map(function (id, i) {
          var labels = {
            hero: 'Нүүр',
            home: 'Хуудаснууд',
            about: 'Бидний тухай',
            services: 'Үйлчилгээ',
            projects: 'Төслүүд',
            contact: 'Холбоо',
            careers: 'Ажлын байр',
            navbar: 'Цэс',
            footer: 'Footer',
          };
          return (
            '<button type="button" class="psc-tab' +
            (i === 0 ? ' active' : '') +
            '" data-psc-tab="' +
            id +
            '">' +
            labels[id] +
            '</button>'
          );
        })
        .join('') +
      '</div>' +
      '<div class="psc-panel active" data-psc-panel="hero"><div class="psc-grid">' +
      field('Тэмдэг', 'hero_badge', h.badge) +
      field('Статистик 1', 'hero_stat1', h.stat1) +
      field('Статистик 2', 'hero_stat2', h.stat2) +
      field('Статистик 3', 'hero_stat3', h.stat3) +
      field('Гарчиг 1', 'hero_title1', h.title1) +
      field('Гарчиг 2', 'hero_title2', h.title2) +
      field('Тайлбар', 'hero_description', h.description, { area: true, rows: 3 }) +
      field('Уриа', 'hero_tagline', h.tagline) +
      field('Товч: Үйлчилгээ', 'hero_btnServices', h.btnServices) +
      field('Товч: Дэлгэрэнгүй', 'hero_btnAbout', h.btnAbout) +
      field('Товч: Холбогдох', 'hero_btnContact', h.btnContact) +
      field('Товч: Ажилд орох', 'hero_btnCareers', h.btnCareers) +
      '</div></div>' +
      '<div class="psc-panel" data-psc-panel="home"><div class="psc-grid">' +
      field('Шошго', 'home_label', hm.label) +
      field('Гарчиг', 'home_title', hm.title) +
      field('«Нээх» товч', 'home_linkOpen', hm.linkOpen) +
      '</div>' +
      homeLinks +
      '</div>' +
      '<div class="psc-panel" data-psc-panel="about"><div class="psc-grid">' +
      field('Шошго', 'about_label', ab.label) +
      field('Гарчиг', 'about_title', ab.title) +
      field('Танилцуулга', 'about_intro', ab.intro, { area: true, rows: 4 }) +
      '</div>' +
      aboutItems +
      '</div>' +
      '<div class="psc-panel" data-psc-panel="services"><div class="psc-grid">' +
      field('Шошго', 'services_label', sv.label) +
      field('Гарчиг', 'services_title', sv.title) +
      '</div>' +
      serviceItems +
      '</div>' +
      '<div class="psc-panel" data-psc-panel="projects"><div class="psc-grid">' +
      field('Шошго', 'projects_label', pj.label) +
      field('Гарчиг', 'projects_title', pj.title) +
      field('Гол чиглэл гарчиг', 'projects_highlightsTitle', pj.highlightsTitle) +
      '</div>' +
      stats +
      highlights +
      '</div>' +
      '<div class="psc-panel" data-psc-panel="contact"><div class="psc-grid">' +
      field('Шошго', 'contact_label', ct.label) +
      field('Гарчиг', 'contact_title', ct.title) +
      field('Хаяг', 'contact_address', ct.address, { area: true, rows: 2 }) +
      field('Утас', 'contact_phone', ct.phone) +
      field('Утас (href)', 'contact_phoneHref', ct.phoneHref) +
      field('Имэйл', 'contact_email', ct.email) +
      field('Имэйл (href)', 'contact_emailHref', ct.emailHref) +
      field('Вэб', 'contact_website', ct.website) +
      field('Ажлын цаг гарчиг', 'contact_hoursTitle', ct.hoursTitle) +
      field('Даваа–Баасан', 'contact_hoursWeekday', ct.hoursWeekday) +
      field('Бямба', 'contact_hoursSaturday', ct.hoursSaturday) +
      field('Ням', 'contact_hoursSunday', ct.hoursSunday) +
      field('Тэмдэглэл', 'contact_hoursNote', ct.hoursNote, { area: true, rows: 2 }) +
      '</div></div>' +
      '<div class="psc-panel" data-psc-panel="careers"><div class="psc-grid">' +
      field('Шошго', 'careers_label', cr.label) +
      field('Гарчиг', 'careers_title', cr.title) +
      field('Танилцуулга (нүүр)', 'careers_intro', cr.intro, { area: true, rows: 3 }) +
      field('Танилцуулга (анкет хуудас)', 'careers_pageIntro', cr.pageIntro, { area: true, rows: 3 }) +
      field('Хажуугийн гарчиг', 'careers_perksTitle', cr.perksTitle) +
      '</div>' +
      perks +
      field('Хажуугийн тэмдэглэл', 'careers_sidebarNote', cr.sidebarNote, { area: true, rows: 3 }) +
      field('Footer', 'careers_footer', cr.footer) +
      field('Буцах (урт)', 'careers_backHome', cr.backHome) +
      field('Буцах (товч)', 'careers_backShort', cr.backShort) +
      '</div>' +
      '<div class="psc-panel" data-psc-panel="navbar"><div class="psc-grid">' +
      field('Брэнд нэр', 'navbar_brand', nb.brand) +
      field('Ажилд орох товч', 'navbar_ctaCareers', nb.ctaCareers) +
      '</div>' +
      navLinks +
      '</div>' +
      '<div class="psc-panel" data-psc-panel="footer"><div class="psc-grid">' +
      field('Брэнд', 'footer_brand', ft.brand) +
      field('Зохиогчийн эрх ({year} ашиглана)', 'footer_copyright', ft.copyright, { area: true, rows: 2 }) +
      '</div></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">' +
      '<button class="btn btn-primary" type="button" id="pscSaveBtn"><span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle">save</span> Хадгалах</button>' +
      '<button class="btn btn-ghost" type="button" id="pscResetBtn">Анхны утга руу</button>' +
      '<a class="btn btn-ghost" href="/" target="_blank" rel="noopener">Вэб нээх</a>' +
      '</div></div>'
    );
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function collectPublicSiteContentFromForm(base) {
    base = base || DEFAULT_PUBLIC_SITE_CONTENT;
    var aboutItems = (base.about.items || []).map(function (_, i) {
      return { title: val('about_title_' + i), text: val('about_text_' + i) };
    });
    var serviceItems = (base.services.items || []).map(function (_, i) {
      return { title: val('service_title_' + i), text: val('service_text_' + i) };
    });
    var homeLinks = (base.home.links || []).map(function (link, i) {
      return Object.assign({}, link, { title: val('home_link_title_' + i), text: val('home_link_text_' + i) });
    });
    var stats = (base.projects.stats || []).map(function (_, i) {
      return { value: val('proj_stat_value_' + i), label: val('proj_stat_label_' + i) };
    });
    var highlights = (base.projects.highlights || []).map(function (_, i) {
      return val('proj_highlight_' + i);
    });
    var navLinks = (base.navbar.links || []).map(function (link, i) {
      return Object.assign({}, link, { label: val('nav_link_' + i) });
    });
    var perks = (base.careers.perks || []).map(function (_, i) {
      return val('career_perk_' + i);
    });

    return {
      navbar: {
        brand: val('navbar_brand'),
        ctaCareers: val('navbar_ctaCareers'),
        links: navLinks,
      },
      hero: {
        stat1: val('hero_stat1'),
        stat2: val('hero_stat2'),
        stat3: val('hero_stat3'),
        badge: val('hero_badge'),
        title1: val('hero_title1'),
        title2: val('hero_title2'),
        description: val('hero_description'),
        tagline: val('hero_tagline'),
        btnServices: val('hero_btnServices'),
        btnAbout: val('hero_btnAbout'),
        btnContact: val('hero_btnContact'),
        btnCareers: val('hero_btnCareers'),
      },
      home: {
        label: val('home_label'),
        title: val('home_title'),
        linkOpen: val('home_linkOpen'),
        links: homeLinks,
      },
      about: {
        label: val('about_label'),
        title: val('about_title'),
        intro: val('about_intro'),
        items: aboutItems,
      },
      services: {
        label: val('services_label'),
        title: val('services_title'),
        items: serviceItems,
      },
      projects: {
        label: val('projects_label'),
        title: val('projects_title'),
        highlightsTitle: val('projects_highlightsTitle'),
        stats: stats,
        highlights: highlights,
      },
      contact: {
        label: val('contact_label'),
        title: val('contact_title'),
        address: val('contact_address'),
        phone: val('contact_phone'),
        phoneHref: val('contact_phoneHref'),
        email: val('contact_email'),
        emailHref: val('contact_emailHref'),
        website: val('contact_website'),
        hoursTitle: val('contact_hoursTitle'),
        hoursWeekday: val('contact_hoursWeekday'),
        hoursSaturday: val('contact_hoursSaturday'),
        hoursSunday: val('contact_hoursSunday'),
        hoursNote: val('contact_hoursNote'),
      },
      careers: {
        label: val('careers_label'),
        title: val('careers_title'),
        intro: val('careers_intro'),
        pageIntro: val('careers_pageIntro'),
        perksTitle: val('careers_perksTitle'),
        perks: perks,
        sidebarNote: val('careers_sidebarNote'),
        footer: val('careers_footer'),
        backHome: val('careers_backHome'),
        backShort: val('careers_backShort'),
      },
      footer: {
        brand: val('footer_brand'),
        copyright: val('footer_copyright'),
      },
    };
  }

  function initPublicSiteEditorTabs() {
    document.querySelectorAll('[data-psc-tab]').forEach(function (btn) {
      btn.onclick = function () {
        var tab = btn.getAttribute('data-psc-tab');
        document.querySelectorAll('.psc-tab').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        document.querySelectorAll('.psc-panel').forEach(function (p) {
          p.classList.toggle('active', p.getAttribute('data-psc-panel') === tab);
        });
      };
    });
  }

  global.DEFAULT_PUBLIC_SITE_CONTENT = DEFAULT_PUBLIC_SITE_CONTENT;
  global.mergePublicSiteContent = mergePublicSiteContent;
  global.renderPublicSiteEditorHtml = renderPublicSiteEditorHtml;
  global.collectPublicSiteContentFromForm = collectPublicSiteContentFromForm;
  global.initPublicSiteEditorTabs = initPublicSiteEditorTabs;
})(typeof window !== 'undefined' ? window : globalThis);
