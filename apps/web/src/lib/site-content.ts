export const SITE_CONTENT_PAGES = [
  "inicio",
  "productos",
  "aboutUs",
  "fincas",
  "contacto",
  "aliados",
] as const;

export type SitePageKey = (typeof SITE_CONTENT_PAGES)[number];

export interface SiteImage {
  url: string;
  publicId: string | null;
  alt: string;
}

export interface InicioContent {
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  heroImage: SiteImage;
  primaryCta: string;
  secondaryCta: string;
  experienceTitle: string;
  experienceDescription: string;
  feature1Title: string;
  feature1Description: string;
  feature2Title: string;
  feature2Description: string;
  feature3Title: string;
  feature3Description: string;
  storyTitleLine1: string;
  storyTitleLine2: string;
  storyDescription1: string;
  storyDescription2: string;
  storyImage: SiteImage;
  closingTitle: string;
  closingDescription: string;
  closingCta: string;
}

export interface ProductosContent {
  heroEyebrow: string;
  heroTitleLead: string;
  heroTitleAccent: string;
  heroDescription: string;
  heroImage: SiteImage;
}

export interface AboutUsContent {
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  heroImage: SiteImage;
  storyEyebrow: string;
  storyTitle: string;
  storyParagraph1: string;
  storyParagraph2: string;
  storyImage: SiteImage;
  valuesEyebrow: string;
  valuesTitle: string;
  valuesDescription: string;
  qualityTitle: string;
  qualityDescription: string;
  sustainabilityTitle: string;
  sustainabilityDescription: string;
  communityTitle: string;
  communityDescription: string;
  producersEyebrow: string;
  producersTitle: string;
  producersDescription: string;
  producersImage: SiteImage;
  producersCta: string;
  farmsEyebrow: string;
  farmsTitle: string;
  farmsDescription: string;
  farmsImage: SiteImage;
  farmsCta: string;
  productsEyebrow: string;
  productsTitle: string;
  productsDescription: string;
  productsImage: SiteImage;
  productsCta: string;
  missionVisionEyebrow: string;
  missionVisionTitle: string;
  missionTitle: string;
  missionDescription: string;
  visionTitle: string;
  visionDescription: string;
  closingTitle: string;
  closingDescription: string;
}

export interface FincasContent {
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  heroImage: SiteImage;
}

export interface ContactoContent {
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  heroImage: SiteImage;
  infoEyebrow: string;
  infoTitle: string;
  infoDescription: string;
  emailLabel: string;
  email: string;
  phoneLabel: string;
  phone: string;
  hoursLabel: string;
  hours: string;
  locationLabel: string;
  location: string;
  socialTitle: string;
  whatsappUrl: string;
  instagramUrl: string;
  formTitle: string;
  formDescription: string;
  fincasTitle: string;
  fincasDescription: string;
  fincasCta: string;
}

export interface AllyItem {
  id: string;
  image: SiteImage;
  active: boolean;
}

export interface AliadosContent {
  title: string;
  description: string;
  speed: number;
  items: AllyItem[];
}

export interface SiteContentMap {
  inicio: InicioContent;
  productos: ProductosContent;
  aboutUs: AboutUsContent;
  fincas: FincasContent;
  contacto: ContactoContent;
  aliados: AliadosContent;
}

export type SiteContent = SiteContentMap[SitePageKey];

export type SiteContentFieldType = "text" | "textarea" | "url" | "image" | "number" | "gallery";

export interface SiteContentField {
  key: string;
  label: string;
  type: SiteContentFieldType;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  help?: string;
}

function image(url: string, alt: string): SiteImage {
  return { url, publicId: null, alt };
}

export const SITE_CONTENT_DEFAULTS: SiteContentMap = {
  inicio: {
    heroEyebrow: "Canastas Verdes",
    heroTitle: "Productos frescos para tu día a día.",
    heroDescription:
      "Descubre nuestros productos pensados para acompañar una alimentación fresca, práctica y saludable.",
    heroImage: image("/images/backgrounds/Main.webp", "Campo colombiano"),
    primaryCta: "Ver Productos",
    secondaryCta: "Conócenos",
    experienceTitle: "Una experiencia sencilla",
    experienceDescription:
      "Diseñamos la plataforma para que puedas encontrar tus productos, realizar tus pedidos y consultar su estado de forma sencilla.",
    feature1Title: "Productos frescos",
    feature1Description:
      "Consulta productos cosechados el mismo día de la entrega, con frescura y sabor en cada compra.",
    feature2Title: "Realiza tu pedido",
    feature2Description:
      "Selecciona tus productos y gestiona tu pedido desde la plataforma, apoyando a agricultores locales.",
    feature3Title: "Calidad garantizada",
    feature3Description:
      "Haz seguimiento de tus pedidos desde tu cuenta y recibe productos seleccionados con cuidado.",
    storyTitleLine1: "Conectando el campo",
    storyTitleLine2: "con tu hogar",
    storyDescription1:
      "Canastas Verdes nació con una misión clara: acercar los productos del campo colombiano a las mesas de las familias urbanas. Creemos que todos merecen acceso a alimentos frescos, sanos y de calidad.",
    storyDescription2:
      "Trabajamos con más de 20 fincas certificadas, garantizando trazabilidad, buenas prácticas agrícolas y comercio justo para los agricultores.",
    storyImage: image("/images/backgrounds/Tractor.webp", "Paisaje del campo colombiano"),
    closingTitle: "¿Listo para comenzar?",
    closingDescription:
      "Únete a cientos de familias que ya disfrutan de productos frescos y orgánicos directo del campo.",
    closingCta: "Explorar Productos",
  },
  productos: {
    heroEyebrow: "Productos del campo",
    heroTitleLead: "Compra productos",
    heroTitleAccent: "frescos",
    heroDescription:
      "Encuentra frutas, verduras y productos provenientes del campo directamente en nuestra plataforma.",
    heroImage: image("/images/backgrounds/alimentos.webp", "Productos frescos del campo"),
  },
  aboutUs: {
    heroEyebrow: "Sobre nosotros",
    heroTitle: "Conoce Canastas Verdes",
    heroDescription:
      "Trabajamos para acercar productos y soluciones a nuestra comunidad mediante una plataforma sencilla, accesible y pensada para las necesidades de nuestros clientes.",
    heroImage: image("/images/backgrounds/about-us.webp", "Canastas Verdes"),
    storyEyebrow: "Nuestra historia",
    storyTitle: "Una forma diferente de conectar productos y personas",
    storyParagraph1:
      "Canastas Verdes nace con la intención de facilitar el acceso a productos mediante una experiencia digital clara y sencilla.",
    storyParagraph2:
      "Nuestra plataforma permite conocer nuestros productos, realizar pedidos y consultar información de manera rápida desde cualquier dispositivo.",
    storyImage: image("/images/backgrounds/content.webp", "Productos de Canastas Verdes"),
    valuesEyebrow: "Lo que nos representa",
    valuesTitle: "Nuestros valores",
    valuesDescription:
      "Principios que orientan nuestra forma de trabajar y relacionarnos con nuestra comunidad.",
    qualityTitle: "Calidad",
    qualityDescription:
      "Seleccionamos nuestros productos pensando en ofrecer una experiencia confiable y de calidad.",
    sustainabilityTitle: "Sostenibilidad",
    sustainabilityDescription:
      "Promovemos alternativas responsables y una relación más consciente con nuestros productos y recursos.",
    communityTitle: "Comunidad",
    communityDescription:
      "Creemos en el trabajo conjunto y en generar valor para las personas que hacen parte de Canastas Verdes.",
    producersEyebrow: "Personas que cultivan",
    producersTitle: "Conoce a nuestros productores",
    producersDescription:
      "Detrás de cada canasta hay familias campesinas, saberes locales y personas que trabajan con dedicación para llevar alimentos frescos a nuestra comunidad.",
    producersImage: image("/images/backgrounds/Tractor.webp", "Productores trabajando en el campo"),
    producersCta: "Conocer nuestro territorio",
    farmsEyebrow: "Origen y trazabilidad",
    farmsTitle: "Historias que nacen en nuestras fincas",
    farmsDescription:
      "Conectamos a nuestra comunidad con fincas y lugares de recogida que nos permiten conocer mejor el origen de los productos y fortalecer el comercio justo.",
    farmsImage: image("/images/backgrounds/banner-campo.webp", "Finca y paisaje rural"),
    farmsCta: "Explorar fincas",
    productsEyebrow: "Del campo a tu mesa",
    productsTitle: "Productos para una alimentación consciente",
    productsDescription:
      "Seleccionamos frutas, verduras y alimentos de calidad para que puedas comprar de forma práctica, apoyar a productores locales y disfrutar la frescura del campo.",
    productsImage: image("/images/backgrounds/alimentos.webp", "Productos frescos del campo"),
    productsCta: "Ver productos",
    missionVisionEyebrow: "Nuestro propósito",
    missionVisionTitle: "Misión y Visión",
    missionTitle: "Misión",
    missionDescription:
      "Conectar a productores, familias y comunidades mediante una plataforma cercana que facilite el acceso a productos frescos, apoye la economía campesina y promueva decisiones de compra más conscientes.",
    visionTitle: "Visión",
    visionDescription:
      "Ser una red reconocida por transformar la relación entre el campo y la ciudad, fortaleciendo mercados justos, sostenibles y construidos con la participación de nuestra comunidad.",
    closingTitle: "Crecemos junto a nuestra comunidad",
    closingDescription:
      "Queremos seguir construyendo una experiencia cada vez mejor para nuestros clientes, colaboradores y aliados.",
  },
  fincas: {
    heroEyebrow: "Canastas Verdes · territorio",
    heroTitle: "Fincas y lugares de recogida",
    heroDescription:
      "Consulta nuestro lugar de recogida y explora las fincas por municipio. Selecciona una finca para abrir su ubicación exacta en Google Maps.",
    heroImage: image("/images/backgrounds/banner-campo.webp", "Paisaje rural"),
  },
  contacto: {
    heroEyebrow: "Estamos para ayudarte",
    heroTitle: "Contáctanos",
    heroDescription:
      "¿Tienes alguna pregunta, sugerencia o necesitas información? Escríbenos y estaremos encantados de ayudarte.",
    heroImage: image("/images/backgrounds/Contacto.jpg", "Contacto Canastas Verdes"),
    infoEyebrow: "PQRDSF",
    infoTitle: "Estamos para escucharte",
    infoDescription:
      "Presenta una Petición, Queja, Reclamo, Denuncia, Sugerencia o Felicitación. Registraremos tu solicitud para que pueda ser gestionada por nuestro equipo.",
    emailLabel: "Correo electrónico",
    email: "contacto.canastasverdes@gmail.com",
    phoneLabel: "Teléfono",
    phone: "+57 300 123 4567",
    hoursLabel: "Horario de atención",
    hours: "Lunes a viernes\n8:00 a. m. — 5:00 p. m.",
    locationLabel: "Ubicación de atención",
    location: "Calle 20, 24 - 64, Pasto, Nariño 520002",
    socialTitle: "Habla con nosotros",
    whatsappUrl: "https://wa.me/c/573154073347",
    instagramUrl: "https://www.instagram.com/canastasverdespasto/",
    formTitle: "Envíanos tu PQRDSF",
    formDescription:
      "Completa los datos y selecciona el tipo de solicitud que deseas presentar.",
    fincasTitle: "También puedes visitarnos",
    fincasDescription:
      "Consulta nuestras fincas para encontrar el punto de atención más cercano.",
    fincasCta: "Ver fincas",
  },
  aliados: {
    title: "Nuestros aliados",
    description: "Empresas, organizaciones y comunidades que hacen parte de Canastas Verdes.",
    speed: 0.15,
    items: [
      { id: "canastas-verdes", image: image("/images/aliados/CanastasVerdes.jpeg", "Canastas Verdes"), active: true },
      { id: "canastas-verdes-bw", image: image("/images/aliados/CanastasVerdesBW.jpeg", "Canastas Verdes en blanco y negro"), active: true },
      { id: "fundacion-suyusama-2", image: image("/images/aliados/FundacionSuyusama2.jpg", "Fundación Suyusama"), active: true },
      { id: "logo-fundacion-suyusama", image: image("/images/aliados/logo-fundacion-suyusama.png", "Logo Fundación Suyusama"), active: true },
      { id: "logo-unicesmag", image: image("/images/aliados/LogoUnicesmag.png", "Logo Unicesmag"), active: true },
    ],
  },
};

const text = (key: string, label: string, maxLength = 300): SiteContentField => ({
  key,
  label,
  type: "text",
  maxLength,
});

const textarea = (key: string, label: string, maxLength = 1200): SiteContentField => ({
  key,
  label,
  type: "textarea",
  maxLength,
});

const url = (key: string, label: string): SiteContentField => ({
  key,
  label,
  type: "url",
  maxLength: 500,
});

const picture = (key: string, label: string, help: string): SiteContentField => ({
  key,
  label,
  type: "image",
  help,
});

export const SITE_CONTENT_FIELDS: Record<SitePageKey, SiteContentField[]> = {
  inicio: [
    text("heroEyebrow", "Etiqueta principal"),
    text("heroTitle", "Título principal", 180),
    textarea("heroDescription", "Descripción principal"),
    picture("heroImage", "Imagen de portada", "JPG, PNG o WEBP. Máximo 5 MB."),
    text("primaryCta", "Botón principal"),
    text("secondaryCta", "Botón secundario"),
    text("experienceTitle", "Título de experiencia"),
    textarea("experienceDescription", "Descripción de experiencia"),
    text("feature1Title", "Título de beneficio 1"),
    textarea("feature1Description", "Descripción de beneficio 1"),
    text("feature2Title", "Título de beneficio 2"),
    textarea("feature2Description", "Descripción de beneficio 2"),
    text("feature3Title", "Título de beneficio 3"),
    textarea("feature3Description", "Descripción de beneficio 3"),
    text("storyTitleLine1", "Título de historia · línea 1"),
    text("storyTitleLine2", "Título de historia · línea 2"),
    textarea("storyDescription1", "Historia · párrafo 1"),
    textarea("storyDescription2", "Historia · párrafo 2"),
    picture("storyImage", "Imagen de historia", "JPG, PNG o WEBP. Máximo 5 MB."),
    text("closingTitle", "Título de cierre"),
    textarea("closingDescription", "Descripción de cierre"),
    text("closingCta", "Botón de cierre"),
  ],
  productos: [
    text("heroEyebrow", "Etiqueta superior"),
    text("heroTitleLead", "Título · primera parte"),
    text("heroTitleAccent", "Título · palabra destacada"),
    textarea("heroDescription", "Descripción superior"),
    picture("heroImage", "Imagen de fondo", "JPG, PNG o WEBP. Máximo 5 MB."),
  ],
  aboutUs: [
    text("heroEyebrow", "Etiqueta de portada"),
    text("heroTitle", "Título de portada", 180),
    textarea("heroDescription", "Descripción de portada"),
    picture("heroImage", "Imagen de portada", "JPG, PNG o WEBP. Máximo 5 MB."),
    text("storyEyebrow", "Etiqueta de historia"),
    text("storyTitle", "Título de historia", 180),
    textarea("storyParagraph1", "Historia · párrafo 1"),
    textarea("storyParagraph2", "Historia · párrafo 2"),
    picture("storyImage", "Imagen de historia", "JPG, PNG o WEBP. Máximo 5 MB."),
    text("valuesEyebrow", "Etiqueta de valores"),
    text("valuesTitle", "Título de valores"),
    textarea("valuesDescription", "Descripción de valores"),
    text("qualityTitle", "Valor · calidad"),
    textarea("qualityDescription", "Descripción · calidad"),
    text("sustainabilityTitle", "Valor · sostenibilidad"),
    textarea("sustainabilityDescription", "Descripción · sostenibilidad"),
    text("communityTitle", "Valor · comunidad"),
    textarea("communityDescription", "Descripción · comunidad"),
    text("producersEyebrow", "Etiqueta · productores"),
    text("producersTitle", "Título · productores", 180),
    textarea("producersDescription", "Descripción · productores"),
    picture("producersImage", "Imagen · productores", "JPG, PNG o WEBP. Máximo 5 MB."),
    text("producersCta", "Botón · productores"),
    text("farmsEyebrow", "Etiqueta · fincas"),
    text("farmsTitle", "Título · fincas", 180),
    textarea("farmsDescription", "Descripción · fincas"),
    picture("farmsImage", "Imagen · fincas", "JPG, PNG o WEBP. Máximo 5 MB."),
    text("farmsCta", "Botón · fincas"),
    text("productsEyebrow", "Etiqueta · productos"),
    text("productsTitle", "Título · productos", 180),
    textarea("productsDescription", "Descripción · productos"),
    picture("productsImage", "Imagen · productos", "JPG, PNG o WEBP. Máximo 5 MB."),
    text("productsCta", "Botón · productos"),
    text("missionVisionEyebrow", "Etiqueta · misión y visión"),
    text("missionVisionTitle", "Título · misión y visión"),
    text("missionTitle", "Título · misión"),
    textarea("missionDescription", "Descripción · misión"),
    text("visionTitle", "Título · visión"),
    textarea("visionDescription", "Descripción · visión"),
    text("closingTitle", "Título de cierre"),
    textarea("closingDescription", "Descripción de cierre"),
  ],
  fincas: [
    text("heroEyebrow", "Etiqueta superior"),
    text("heroTitle", "Título de fincas", 180),
    textarea("heroDescription", "Descripción de fincas"),
    picture("heroImage", "Imagen de fondo", "JPG, PNG o WEBP. Máximo 5 MB."),
  ],
  contacto: [
    text("heroEyebrow", "Etiqueta de portada"),
    text("heroTitle", "Título de portada"),
    textarea("heroDescription", "Descripción de portada"),
    picture("heroImage", "Imagen de portada", "JPG, PNG o WEBP. Máximo 5 MB."),
    text("infoEyebrow", "Etiqueta informativa"),
    text("infoTitle", "Título informativo"),
    textarea("infoDescription", "Descripción informativa"),
    text("emailLabel", "Etiqueta de correo"),
    text("email", "Correo electrónico", 180),
    text("phoneLabel", "Etiqueta de teléfono"),
    text("phone", "Teléfono", 80),
    text("hoursLabel", "Etiqueta de horario"),
    textarea("hours", "Horario", 180),
    text("locationLabel", "Etiqueta de ubicación"),
    text("location", "Ubicación", 300),
    text("socialTitle", "Título de redes sociales"),
    url("whatsappUrl", "Enlace de WhatsApp"),
    url("instagramUrl", "Enlace de Instagram"),
    text("formTitle", "Título del formulario"),
    textarea("formDescription", "Descripción del formulario"),
    text("fincasTitle", "Título de sección fincas"),
    textarea("fincasDescription", "Descripción de sección fincas"),
    text("fincasCta", "Botón de sección fincas"),
  ],
  aliados: [
    text("title", "Título del carrusel"),
    textarea("description", "Texto del carrusel", 300),
    {
      key: "speed",
      label: "Velocidad automática (px/frame)",
      type: "number",
      min: 0.03,
      max: 1,
      step: 0.01,
      help: "Usa un valor entre 0.03 y 1. Valores bajos se desplazan más lento.",
    },
    {
      key: "items",
      label: "Imágenes de aliados",
      type: "gallery",
      help: "Agrega imágenes JPG, PNG o WEBP de máximo 5 MB. Puedes desactivar una imagen sin eliminarla.",
    },
  ],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function cloneDefaultContent<K extends SitePageKey>(page: K): SiteContentMap[K] {
  return JSON.parse(JSON.stringify(SITE_CONTENT_DEFAULTS[page])) as SiteContentMap[K];
}

function isAllowedImageUrl(value: string): boolean {
  if (value.startsWith("/images/")) return true;

  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      [
        "res.cloudinary.com",
        "firebasestorage.googleapis.com",
        "storage.googleapis.com",
      ].some((hostname) => parsed.hostname === hostname || parsed.hostname.endsWith(`.${hostname}`))
    );
  } catch {
    return false;
  }
}

function isAllowedUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function normalizeSiteContent(
  page: SitePageKey,
  input: unknown,
): { data: SiteContent; errors: string[] } {
  const defaults = cloneDefaultContent(page) as unknown as Record<string, unknown>;
  const source = isRecord(input) ? input : {};
  const errors: string[] = [];

  for (const field of SITE_CONTENT_FIELDS[page]) {
    const raw = source[field.key];
    const fallback = defaults[field.key];

    if (field.type === "number") {
      const numeric = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
      if (!Number.isFinite(numeric) || (field.min !== undefined && numeric < field.min) || (field.max !== undefined && numeric > field.max)) {
        errors.push(`${field.label}: debe ser un número entre ${field.min ?? ""} y ${field.max ?? ""}.`);
        continue;
      }
      defaults[field.key] = numeric;
      continue;
    }

    if (field.type === "gallery") {
      if (!Array.isArray(raw)) continue;
      if (raw.length > 24) {
        errors.push(`${field.label}: no puede tener más de 24 imágenes.`);
        continue;
      }

      const items: AllyItem[] = [];
      for (const rawItem of raw) {
        if (!isRecord(rawItem) || !isRecord(rawItem.image)) {
          errors.push(`${field.label}: una entrada no es válida.`);
          continue;
        }

        const id = typeof rawItem.id === "string"
          ? rawItem.id.trim().replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80)
          : "";
        const imageValue = rawItem.image;
        const imageUrl = typeof imageValue.url === "string" ? imageValue.url.trim() : "";
        const publicId = imageValue.publicId == null ? null : typeof imageValue.publicId === "string" ? imageValue.publicId.trim() : null;
        const alt = typeof imageValue.alt === "string" ? imageValue.alt.trim().slice(0, 180) : "";

        if (!id || !isAllowedImageUrl(imageUrl)) {
          errors.push(`${field.label}: cada imagen debe tener un identificador y una URL válida.`);
          continue;
        }

        items.push({
          id,
          image: { url: imageUrl, publicId, alt: alt || "Aliado de Canastas Verdes" },
          active: rawItem.active !== false,
        });
      }

      const uniqueIds = new Set<string>();
      if (items.some((item) => uniqueIds.has(item.id) || uniqueIds.add(item.id).size === 0)) {
        errors.push(`${field.label}: no puede haber identificadores repetidos.`);
        continue;
      }

      defaults[field.key] = items;
      continue;
    }

    if (field.type === "image") {
      if (!isRecord(raw)) {
        continue;
      }

      const imageUrl = typeof raw.url === "string" ? raw.url.trim() : "";
      const publicId = raw.publicId == null ? null : typeof raw.publicId === "string" ? raw.publicId.trim() : null;
      const alt = typeof raw.alt === "string" ? raw.alt.trim().slice(0, 180) : "";

      if (!isAllowedImageUrl(imageUrl)) {
        errors.push(`${field.label}: la URL de imagen no está permitida.`);
        continue;
      }

      defaults[field.key] = {
        url: imageUrl,
        publicId,
        alt: alt || (isRecord(fallback) && typeof fallback.alt === "string" ? fallback.alt : "Imagen de Canastas Verdes"),
      } satisfies SiteImage;
      continue;
    }

    if (typeof raw !== "string") continue;

    const value = raw.trim();
    const maxLength = field.maxLength ?? 1200;
    if (value.length > maxLength) {
      errors.push(`${field.label}: supera el máximo de ${maxLength} caracteres.`);
      continue;
    }
    if (field.type === "url" && value && !isAllowedUrl(value)) {
      errors.push(`${field.label}: el enlace no es válido.`);
      continue;
    }

    defaults[field.key] = value;
  }

  return { data: defaults as unknown as SiteContent, errors };
}

export function mergeSiteContent<K extends SitePageKey>(page: K, stored: unknown): SiteContentMap[K] {
  return normalizeSiteContent(page, stored).data as SiteContentMap[K];
}

