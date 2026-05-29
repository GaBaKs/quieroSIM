export type Language = 'ES' | 'EN' | 'PT';

// Fallback to simpler any type to avoid strict TS interface building for nested objects
export const translations: Record<Language, any> = {
  ES: {
    navbar: {
      about: 'Quiénes somos',
      howItWorks: 'Cómo Funciona',
      destinations: 'Destinos',
      compatibility: 'Compatibilidad',
      testimonials: 'Testimonios',
      faq: 'Preguntas',
      buyEsim: 'Comprar eSIM'
    },
    hero: {
      slogan: 'Internet para Viajar',
      titleHighlight: 'Quiero',
      titleHighlight2: 'SIM',
      titleRest: ' Internet eSIM rápido, fácil y confiable',
      subtitle: 'En más de 190 países desde $12 USD. Lo activas en minutos antes de despegar.',
      searchPlaceholder: '¿A dónde viajas?',
      seePlans: 'Ver planes',
      popular: 'Popular:',
      regions: {
        europe: 'Europa',
        spain: 'España',
        usa: 'EE.UU.',
        brazil: 'Brasil',
        japan: 'Japón',
        global: 'Global'
      },
      features: ['Activación en 2 min', 'Sin roaming oculto', 'QR instantáneo'],
      phoneLine: 'Línea de Datos Virtual',
      phoneActive: 'Activo',
      phoneConsumidos: '7.5 GB Consumidos',
      phoneTotales: '10 GB Totales',
      phoneAuto: 'Activación Automática',
      phoneAutoDesc: 'Recibes tu código QR por correo, escaneas antes de embarcar y listo.',
      phoneSupport: 'Soporte Global · QUIERO LLC'
    },
    howItWorks: {
      badge: 'Instalación',
      title: 'Tu internet en 3 pasos',
      subtitle: 'Olvídate de buscar tiendas locales o cambiar de chip. Así de fácil es tener datos al viajar.',
      steps: [
        { title: 'Elige tu Destino', desc: 'Busca tu país de destino o región y selecciona el plan de datos que mejor se adapte a tu estadía.' },
        { title: 'Paga Seguro', desc: 'Realiza tu pago en USD sin impuestos sorpresa mediante nuestra integración certificada de Stripe.' },
        { title: 'Escanea el QR', desc: 'Recibe un correo y escanea el código con la cámara de tu móvil para descargar el perfil automáticamente.' }
      ]
    },
    destinations: {
      badge: 'Destinos',
      title: 'Encuentra el plan para tu viaje',
      subtitle: 'Cobertura en más de 190 destinos con las mejores redes locales y estabilidad garantizada.',
      search: 'Buscar país o región...',
      filterAll: 'Ver Todos',
      filterPopular: 'Populares',
      filterRegional: 'Regionales',
      noResults: 'No encontramos planes para',
      data: 'Datos',
      days: 'Días',
      buy: 'Comprar',
      unlimited: 'Ilimitados',
      termsActive: 'Activación en destino',
      termsHotspot: 'Permite compartir wifi',
      details: {
        plansFor: 'Planes de eSIM para {country}',
        prepaidPlans: 'Planes prepagos en USD válidos para redes de alta velocidad 5G y 4G LTE en destino.',
        stripeGuarantee: 'Garantía Stripe',
        mostPopular: 'MÁS POPULAR',
        features: {
          network: 'Red {name}',
          speed: 'Internet 4G/5G LTE',
          speedHigh: 'Internet 5G de Alta Velocidad',
          hotspot: 'Compartir Datos (Hotspot)',
          hotspotLimit: 'Compartir hasta 5GB',
          instant: 'Activación instantánea',
          localNumber: 'Número local de {country} (opcional)'
        },
        deliveryTitle: '¿Cuál es el proceso de entrega?',
        deliveryDesc: 'Inmediatamente procesado el pago en el gateway seguro de Stripe, enviamos las credenciales unívocas (un código QR dinámico) al correo redactado en segundos. Escanea el código en opciones celulares de tu teléfono para descargar el perfil y enciende el Roaming de Datos al ingresar a {country}.'
      }
    },
    compatibility: {
      badge: 'Compatibilidad',
      title: '¿Mi móvil es compatible?',
      subtitle: 'La mayoría de los smartphones desde 2019 soportan eSIM. Revisa si el tuyo está listo.',
      unlockedText: '⚠️ IMPORTANTE: Tu dispositivo debe estar desbloqueado (libre de fábrica) y no asociado a un contrato exclusivo de un operador para que la eSIM funcione.',
      checkDial: 'También puedes comprobar la compatibilidad marcando *#06# en tu dispositivo. Si aparece un código EID, tu móvil es compatible con eSIM.',
      checkerTitle: 'Verificador Sencillo',
      checkerDesc: 'Escribe tu modelo de celular para comprobar la compatibilidad al instante.',
      checkerPlaceholder: 'Ej. iPhone 13, Galaxy S22...',
      referenceTitle: 'MODELOS DE REFERENCIA HOMOLOGADOS',
      othersBtn: 'Otros',
      brands: {
        apple: 'iPhone XR, XS, 11, 12, 13, 14, 15, SE (2da Gen+) y modelos más recientes.',
        samsung: 'Galaxy S20, S21, S22, S23, S24, Z Flip, Z Fold, Note 20 y series recientes.',
        google: 'Pixel 3, 4, 5, 6, 7, 8 y dispositivos Pixel Fold.',
        motorola: 'Razr 2019+, Moto G53, Edge 40 y modelos gama alta compatibles.',
        other: 'Huawei P40, Mate 40 Pro, Xiaomi 12T Pro, Sony Xperia 10 IV, Oppo Find X3 Pro.'
      }
    },
    testimonials: {
      badge: 'Opiniones Verificadas',
      title: 'Lo que dicen los viajeros',
      subtitle: 'Más de 10,000 viajeros confían en QuieroSIM para mantenerse conectados en todo momento.',
      reviews: [
        { name: 'María Laura', handle: '@marilaura89', text: 'Increíble lo rápido que fue todo. Aterricé en Miami y ya tenía internet. Nada de cambiar chips.', location: 'Viaje a EE.UU.' },
        { name: 'Juan Cruz', handle: '@juan_viajero', text: 'El plan de 10GB en Europa me rindió perfecto. Y el soporte me ayudó enseguida cuando tuve una duda.', location: 'Viaje a España' },
        { name: 'Carolina M.', handle: '@carom_tech', text: 'Soy productora y necesito conectividad siempre. El roaming me arruinaba. QuieroSIM me salvó la vida en mi estadía en la gira en Chile.', location: 'Viaje a Chile' }
      ],
      feedbackTitle: '¿Tuviste una buena experiencia con tu eSIM?',
      feedbackDesc: 'Trabajamos incansablemente por brindar la mejor conectividad turística de telecomunicaciones. Tu opinión ayuda tanto a otros viajeros como a las auditorías de satisfacción de nuestros canales de pago.',
      feedbackBtn: 'Enviar mi Calificación'
    },
    faq: {
      badge: 'Centro de Ayuda',
      title: 'Dudas Frecuentes',
      subtitle: 'Encuentra las respuestas que necesitas sobre nuestro servicio de eSIM y facturación.',
      items: [
        { q: '¿Qué es una eSIM y cómo funciona?', a: 'Una eSIM (embedded SIM) es una tarjeta SIM virtual o digital que ya está integrada en el chip interno de los smartphones modernos de fábrica. Funciona igual que una SIM tradicional de plástico, pero no requiere inserción física. Adquieres el plan móvil de forma 100% online, lo descargas inmediatamente escaneando un código QR recibido por mail y se conecta de forma directa a las antenas celulares locales autorizadas en destino.' },
        { q: '¿Cuándo debo instalar el código QR de mi eSIM?', a: 'Te recomendamos escanear e instalar el código QR en tu teléfono horas antes de tu viaje, mientras aún tengas una conexión WiFi estable en tu casa o aeropuerto de origen. El plan no comenzará a consumir sus días de vigencia hasta que llegues al destino y el teléfono se conecte por primera vez a la red local.' },
        { q: '¿Mi celular debe tener la Itinerancia de Datos (Roaming) encendida?', a: 'Sí. Para que la eSIM de QuieroSIM pueda conectarse a las redes asociadas en el país de destino, debes activar la opción de "Itinerancia de Datos" (o "Data Roaming") en la configuración de la línea eSIM instalada. Esto no generará cargos extra, ya que es una línea prepaga de datos.' },
        { q: '¿Puedo realizar llamadas telefónicas tradicionales o enviar SMS?', a: 'Nuestras eSIM están diseñadas exclusivamente para proveer Datos Móviles (Internet). No incluyen un número telefónico tradicional para llamadas de voz por red celular ni SMS. Sin embargo, podrás usar aplicaciones como WhatsApp, FaceTime, Telegram, Skype o iMessage con total normalidad para comunicarte por voz y texto usando tus datos.' },
        { q: '¿Qué pasa si consumo la totalidad de los datos de mi plan?', a: 'Si consumes la totalidad de los Gigabytes (GB) de tu paquete antes de que terminen los días de vigencia, la conexión a internet se detendrá. Al ser un servicio prepago, nunca te cobraremos excedentes ni cargos automáticos por uso adicional. Podrás adquirir una nueva eSIM en nuestra web si necesitas más datos.' },
        { q: '¿Se instala el mismo código QR eSIM en múltiples teléfonos?', a: 'No. Por estrictas regulaciones y límites técnicos internacionales de telecomunicaciones, cada perfil eSIM es de única descarga. Puede instalarse una sola vez en un único dispositivo y queda vinculado permanentemente a ese número de serie digital. Si decides eliminar el perfil de la configuración de tu teléfono de viaje, el código QR quedará inutilizado y no podrá reinstalarse en el mismo ni en otro teléfono.' },
        { q: '¿Emiten comprobante o factura de compra?', a: 'Sí. Inmediatamente después de autorizar el cobro del prepago a través de Stripe, recibirás de forma automática en tu correo el número de orden y factura en formato corporativo PDF de QUIERO LLC, con todos los detalles de la compra.' },
        { q: '¿Tienen asistencia posventa en idioma español?', a: 'Totalmente. Entendemos el contratiempo que puede ocasionar quedarse sin conexión en un viaje. Por ello, contamos con un calificado equipo de soporte técnico en español disponible las 24 horas del día, los 7 días de la semana, a través del correo support@quierosim.com o vía chat web, listos para resolver cualquier consulta en minutos.' }
      ]
    },
    footer: {
      desc: 'Tecnología eSIM para conectividad internacional inmediata. Internet de alta velocidad en más de 190 países sin cargos ocultos ni sorpresas de roaming.',
      securePayment: 'Canal de pago seguro:',
      linksTitle: 'Enlaces',
      links: ['Destinos Populares', 'Compatibilidad eSIM', 'Opiniones de Clientes', 'Preguntas Frecuentes'],
      supportTitle: 'Soporte y Garantías',
      rights: 'Todos los derechos reservados.',
      privacy: 'Política de Privacidad',
      terms: 'Términos de Servicio',
      refund: 'Política de Reembolso'
    },
    checkout: {
      title: 'Compra Segura eSIM',
      selectedPlan: 'Plan Seleccionado',
      validFor: 'Válido por {days} días · Activación por QR en 2 min',
      deliveryInfo: '1. Datos de Entrega',
      email: 'Correo Electrónico',
      emailHelp: 'Aquí enviaremos el código QR de configuración de la eSIM de inmediato.',
      name: 'Nombre Completo',
      phone: 'Teléfono Móvil (WhatsApp)',
      paymentInfo: '2. Información de Pago (vía Stripe)',
      secureSSL: 'Cifrado SSL',
      cardNumber: 'Número de Tarjeta',
      expiry: 'Vencimiento',
      cvc: 'CVC / CVV',
      warning: 'Al presionar "Pagar hoy", confirmas que tu móvil es compatible con eSIM y está libre para cualquier operador. Pago único sin suscripción.',
      payBtn: 'Pagar ${price} USD Ahora',
      processingTitle: 'Procesando Pago Seguro',
      processingSub: 'Por favor, mantén esta ventana abierta. Estamos comunicándonos de forma segura con los servidores de Stripe...',
      successTitle: '¡Compra Completada!',
      successSub: 'Hemos enviado tu factura legal en USD y el manual al mail. Tu eSIM ya está lista para instalar.',
      manualCode: 'Código de Activación Manual',
      scanInstruction: 'Escanea el QR con la cámara de tu móvil para descargar el perfil automáticamente.',
      installStepsTitle: 'Pasos de Instalación Rápida',
      step1Title: 'Conéctate a WiFi',
      step1Desc: 'Asegúrate de tener conexión WiFi estable antes de iniciar la instalación.',
      step2Title: 'Escanea el QR',
      step2Desc: 'Ve a Red Celular → Añadir Plan de Datos, y escanea el código superior.',
      step3Title: 'Activa al llegar',
      step3Desc: 'Al bajar del avión, marca la línea eSIM como principal y enciende la Itinerancia de Datos.',
      order: 'Orden:',
      operatedBy: 'Operado legalmente por: QUIERO LLC',
      understood: 'Entendido'
    }
  },
  EN: {
    navbar: {
      about: 'About Us',
      howItWorks: 'How it Works',
      destinations: 'Destinations',
      compatibility: 'Compatibility',
      testimonials: 'Reviews',
      faq: 'FAQ',
      buyEsim: 'Buy eSIM'
    },
    hero: {
      slogan: 'Internet for Travel',
      titleHighlight: 'Quiero',
      titleHighlight2: 'SIM',
      titleRest: ' Fast, easy and reliable eSIM internet',
      subtitle: 'In more than 190 countries starting at $12 USD. Activate it in minutes before taking off.',
      searchPlaceholder: 'Where are you traveling?',
      seePlans: 'See plans',
      popular: 'Popular:',
      regions: {
        europe: 'Europe',
        spain: 'Spain',
        usa: 'USA',
        brazil: 'Brazil',
        japan: 'Japan',
        global: 'Global'
      },
      features: ['2 min activation', 'No hidden roaming', 'Instant QR code'],
      phoneLine: 'Virtual Data Line',
      phoneActive: 'Active',
      phoneConsumidos: '7.5 GB Used',
      phoneTotales: '10 GB Total',
      phoneAuto: 'Automatic Activation',
      phoneAutoDesc: 'Receive a QR code via email, scan it before boarding, and you are ready.',
      phoneSupport: 'Global Support · QUIERO LLC'
    },
    howItWorks: {
      badge: 'Installation',
      title: 'Your internet in 3 steps',
      subtitle: 'Forget looking for local stores or swapping SIMs. This is how easy it is to get data while traveling.',
      steps: [
        { title: 'Choose your Destination', desc: 'Search for your destination country or region and select the data plan that best suits your stay.' },
        { title: 'Secure Payment', desc: 'Securely pay in USD with no surprise taxes through our certified Stripe integration.' },
        { title: 'Scan the QR', desc: 'Receive an email and scan the QR code with your mobile camera to automatically download the profile.' }
      ]
    },
    destinations: {
      badge: 'Destinations',
      title: 'Find the plan for your trip',
      subtitle: 'Coverage in over 190 destinations with the best local networks and guaranteed stability.',
      search: 'Search country or region...',
      filterAll: 'View All',
      filterPopular: 'Popular',
      filterRegional: 'Regional',
      noResults: 'No plans found for',
      data: 'Data',
      days: 'Days',
      buy: 'Buy',
      unlimited: 'Unlimited',
      termsActive: 'Activates at destination',
      termsHotspot: 'Allows hotspot sharing',
      details: {
        plansFor: 'eSIM Plans for {country}',
        prepaidPlans: 'Prepaid USD plans valid for high-speed 5G and 4G LTE networks at destination.',
        stripeGuarantee: 'Stripe Guarantee',
        mostPopular: 'MOST POPULAR',
        features: {
          network: '{name} Network',
          speed: '4G/5G LTE Internet',
          speedHigh: 'High-speed 5G Internet',
          hotspot: 'Data Sharing (Hotspot)',
          hotspotLimit: 'Share up to 5GB',
          instant: 'Instant activation',
          localNumber: '{country} local number (optional)'
        },
        deliveryTitle: 'What is the delivery process?',
        deliveryDesc: 'Immediately after the payment is processed in Stripe\'s secure gateway, we send the unique credentials (a dynamic QR code) to the provided email in seconds. Scan the code in your phone\'s cellular options to download the profile and turn on Data Roaming upon entering {country}.'
      }
    },
    compatibility: {
      badge: 'Compatibility',
      title: 'Is my phone compatible?',
      subtitle: 'Most smartphones since 2019 support eSIM. Check if yours is ready.',
      unlockedText: '⚠️ IMPORTANT: Your device must be unlocked (factory free) and not associated with an exclusive carrier contract for the eSIM to work.',
      checkDial: 'You can also check compatibility by dialing *#06# on your device. If an EID code appears, your phone is eSIM compatible.',
      checkerTitle: 'Simple Checker',
      checkerDesc: 'Type your phone model to check compatibility instantly.',
      checkerPlaceholder: 'e.g., iPhone 13, Galaxy S22...',
      referenceTitle: 'APPROVED REFERENCE MODELS',
      othersBtn: 'Others',
      brands: {
        apple: 'iPhone XR, XS, 11, 12, 13, 14, 15, SE (2nd Gen+) and newer models.',
        samsung: 'Galaxy S20, S21, S22, S23, S24, Z Flip, Z Fold, Note 20 and recent series.',
        google: 'Pixel 3, 4, 5, 6, 7, 8 and Pixel Fold devices.',
        motorola: 'Razr 2019+, Moto G53, Edge 40 and compatible high-end models.',
        other: 'Huawei P40, Mate 40 Pro, Xiaomi 12T Pro, Sony Xperia 10 IV, Oppo Find X3 Pro.'
      }
    },
    testimonials: {
      badge: 'Verified Reviews',
      title: 'What travelers say',
      subtitle: 'More than 10,000 travelers trust QuieroSIM to stay connected at all times.',
      reviews: [
        { name: 'Maria Laura', handle: '@marilaura89', text: 'Incredible how fast everything was. I landed in Miami and already had internet. No chip swapping.', location: 'Trip to USA' },
        { name: 'Juan Cruz', handle: '@juan_viajero', text: 'The 10GB plan in Europe worked perfectly for me. And the support helped right away when I had a question.', location: 'Trip to Spain' },
        { name: 'Carolina M.', handle: '@carom_tech', text: 'I am a producer and I need connectivity always. Roaming was ruining me. QuieroSIM saved my life during my tour in Chile.', location: 'Trip to Chile' }
      ],
      feedbackTitle: 'Did you have a good experience with your eSIM?',
      feedbackDesc: 'We work tirelessly to provide the best tourist telecommunications connectivity. Your feedback helps both other travelers and the satisfaction audits of our payment channels.',
      feedbackBtn: 'Submit Rating'
    },
    faq: {
      badge: 'Help Center',
      title: 'Frequently Asked Questions',
      subtitle: 'Find the answers you need about our eSIM service and billing.',
      items: [
        { q: 'What is an eSIM and how does it work?', a: 'An eSIM (embedded SIM) is a virtual or digital SIM card already integrated into the internal chip of modern smartphones. It works just like a traditional plastic SIM, but requires no physical insertion. You buy the mobile plan 100% online, download it immediately by scanning a QR code received by email, and it connects directly to authorized local cellular antennas at your destination.' },
        { q: 'When should I install my eSIM QR code?', a: 'We recommend scanning and installing the QR code on your phone hours before your trip, while you still have a stable WiFi connection at home or your departure airport. The plan will not start consuming its validity days until you arrive at the destination and the phone connects to the local network for the first time.' },
        { q: 'Does my phone need to have Data Roaming turned on?', a: 'Yes. For the QuieroSIM eSIM to connect to partner networks in the destination country, you must turn on the "Data Roaming" option in the installed eSIM line settings. This will not generate extra charges, as it is a prepaid data line.' },
        { q: 'Can I make traditional phone calls or send SMS?', a: 'Our eSIMs are designed exclusively to provide Mobile Data (Internet). They do not include a traditional phone number for cellular voice calls or SMS. However, you can use applications like WhatsApp, FaceTime, Telegram, Skype, or iMessage completely normally to communicate via voice and text using your data.' },
        { q: 'What happens if I use all the data in my plan?', a: 'If you use all the Gigabytes (GB) in your package before the validity days end, the internet connection will stop. Being a prepaid service, we will never charge you overages or automatic fees for additional use. You can buy a new eSIM on our website if you need more data.' },
        { q: 'Can the same eSIM QR code be installed on multiple phones?', a: 'No. Due to strict regulations and international telecommunications technical limits, each eSIM profile is single-download. It can be installed only once on a single device and remains permanently linked to that digital serial number. If you decide to delete the profile from your travel phone settings, the QR code will be unusable and cannot be reinstalled on the same or another phone.' },
        { q: 'Do you issue a receipt or purchase invoice?', a: 'Yes. Immediately after authorizing the prepaid charge through Stripe, you will automatically receive in your email the order number and invoice in corporate PDF format from QUIERO LLC, with all the purchase details.' },
        { q: 'Do you have after-sales support?', a: 'Absolutely. We understand the inconvenience of being without connection on a trip. Therefore, we have a qualified technical support team available 24 hours a day, 7 days a week, through the email support@quierosim.com or via web chat, ready to resolve any questions in minutes.' }
      ]
    },
    footer: {
      desc: 'eSIM technology for immediate international connectivity. High-speed internet in over 190 countries with no hidden fees or roaming surprises.',
      securePayment: 'Secure payment channel:',
      linksTitle: 'Links',
      links: ['Popular Destinations', 'eSIM Compatibility', 'Customer Reviews', 'FAQ'],
      supportTitle: 'Support and Warranties',
      rights: 'All rights reserved.',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      refund: 'Refund Policy'
    },
    checkout: {
      title: 'Secure eSIM Purchase',
      selectedPlan: 'Selected Plan',
      validFor: 'Valid for {days} days · QR Activation in 2 min',
      deliveryInfo: '1. Delivery Details',
      email: 'Email',
      emailHelp: 'We will send the eSIM configuration QR code here immediately.',
      name: 'Full Name',
      phone: 'Mobile Phone (WhatsApp)',
      paymentInfo: '2. Payment Information (via Stripe)',
      secureSSL: 'SSL Encryption',
      cardNumber: 'Card Number',
      expiry: 'Expiration',
      cvc: 'CVC / CVV',
      warning: 'By pressing "Pay today", you confirm that your mobile is compatible with eSIM and is unlocked for any carrier. Single payment, no subscription.',
      payBtn: 'Pay ${price} USD Now',
      processingTitle: 'Processing Secure Payment',
      processingSub: 'Please keep this window open. We are communicating securely with Stripe servers...',
      successTitle: 'Purchase Completed!',
      successSub: 'We have sent your legal USD invoice and the manual to your email. Your eSIM is ready to install.',
      manualCode: 'Manual Activation Code',
      scanInstruction: 'Scan the QR code with your mobile camera to download the profile automatically.',
      installStepsTitle: 'Quick Installation Steps',
      step1Title: 'Connect to WiFi',
      step1Desc: 'Make sure you have a stable WiFi connection before starting.',
      step2Title: 'Scan the QR',
      step2Desc: 'Go to Cellular Network → Add Data Plan, and scan the QR code above.',
      step3Title: 'Activate on arrival',
      step3Desc: 'Upon getting off the plane, set the eSIM line as primary and turn on Data Roaming.',
      order: 'Order:',
      operatedBy: 'Legally operated by: QUIERO LLC',
      understood: 'Understood'
    }
  },
  PT: {
    navbar: {
      about: 'Quem somos',
      howItWorks: 'Como Funciona',
      destinations: 'Destinos',
      compatibility: 'Compatibilidade',
      testimonials: 'Depoimentos',
      faq: 'Perguntas',
      buyEsim: 'Comprar eSIM'
    },
    hero: {
      slogan: 'Internet para Viajar',
      titleHighlight: 'Quiero',
      titleHighlight2: 'SIM',
      titleRest: ' Internet eSIM rápido, fácil e confiável',
      subtitle: 'Em mais de 190 países a partir de US$ 12. Ative em minutos antes de decolar.',
      searchPlaceholder: 'Para onde viaja?',
      seePlans: 'Ver planos',
      popular: 'Popular:',
      regions: {
        europe: 'Europa',
        spain: 'Espanha',
        usa: 'EUA',
        brazil: 'Brasil',
        japan: 'Japão',
        global: 'Global'
      },
      features: ['Ativação em 2 min', 'Sem roaming oculto', 'QR instantâneo'],
      phoneLine: 'Linha de Dados Virtual',
      phoneActive: 'Ativo',
      phoneConsumidos: '7.5 GB Usados',
      phoneTotales: '10 GB Total',
      phoneAuto: 'Ativação Automática',
      phoneAutoDesc: 'Receba seu código QR por e-mail, escaneie antes de embarcar e pronto.',
      phoneSupport: 'Suporte Global · QUIERO LLC'
    },
    howItWorks: {
      badge: 'Instalação',
      title: 'Sua internet em 3 passos',
      subtitle: 'Esqueça procurar lojas locais ou trocar de chip. É assim fácil ter dados enquanto viaja.',
      steps: [
        { title: 'Escolha seu Destino', desc: 'Procure seu país ou região de destino e escolha o plano de dados que melhor se adapte à sua estadia.' },
        { title: 'Pague Seguro', desc: 'Pague em USD sem taxas surpresa usando nossa integração segura do Stripe.' },
        { title: 'Escaneie o QR', desc: 'Receba um e-mail e escaneie o código QR com a câmera do seu celular para baixar o perfil automaticamente.' }
      ]
    },
    destinations: {
      badge: 'Destinos',
      title: 'Encontre o plano para a sua viagem',
      subtitle: 'Cobertura em mais de 190 destinos com as melhores redes locais e estabilidade garantida.',
      search: 'Pesquisar país ou região...',
      filterAll: 'Ver Todos',
      filterPopular: 'Populares',
      filterRegional: 'Regionais',
      noResults: 'Nenhum plano encontrado para',
      data: 'Dados',
      days: 'Dias',
      buy: 'Comprar',
      unlimited: 'Ilimitados',
      termsActive: 'Ativação no destino',
      termsHotspot: 'Permite compartilhar wi-fi',
      details: {
        plansFor: 'Planos de eSIM para {country}',
        prepaidPlans: 'Planos pré-pagos em USD válidos para redes de alta velocidade 5G e 4G LTE no destino.',
        stripeGuarantee: 'Garantia Stripe',
        mostPopular: 'MAIS POPULAR',
        features: {
          network: 'Rede {name}',
          speed: 'Internet 4G/5G LTE',
          speedHigh: 'Internet 5G de Alta Velocidade',
          hotspot: 'Compartilhar Dados (Hotspot)',
          hotspotLimit: 'Compartilhar até 5GB',
          instant: 'Ativação instantânea',
          localNumber: 'Número local de {country} (opcional)'
        },
        deliveryTitle: 'Qual é o processo de entrega?',
        deliveryDesc: 'Imediatamente após o processamento do pagamento no gateway seguro do Stripe, enviamos as credenciais exclusivas (um código QR dinâmico) para o e-mail fornecido em segundos. Escaneie o código nas opções de celular do seu telefone para baixar o perfil e ative o Roaming de Dados ao entrar em {country}.'
      }
    },
    compatibility: {
      badge: 'Compatibilidade',
      title: 'Meu celular é compatível?',
      subtitle: 'A maioria dos smartphones desde 2019 tem suporte a eSIM. Verifique se o seu está pronto.',
      unlockedText: '⚠️ IMPORTANTE: Seu dispositivo deve estar desbloqueado (livre de fábrica) e não associado a um contrato exclusivo de operadora para o eSIM funcionar.',
      checkDial: 'Você também pode verificar a compatibilidade discando *#06# no seu dispositivo. Se aparecer um código EID, seu celular é compatível com eSIM.',
      checkerTitle: 'Verificador Simples',
      checkerDesc: 'Digite o modelo do seu celular para verificar a compatibilidade instantaneamente.',
      checkerPlaceholder: 'Ex. iPhone 13, Galaxy S22...',
      referenceTitle: 'MODELOS DE REFERÊNCIA HOMOLOGADOS',
      othersBtn: 'Outros',
      brands: {
        apple: 'iPhone XR, XS, 11, 12, 13, 14, 15, SE (2ª Gen+) e modelos mais recentes.',
        samsung: 'Galaxy S20, S21, S22, S23, S24, Z Flip, Z Fold, Note 20 e séries recentes.',
        google: 'Pixel 3, 4, 5, 6, 7, 8 e dispositivos Pixel Fold.',
        motorola: 'Razr 2019+, Moto G53, Edge 40 e modelos de ponta compatíveis.',
        other: 'Huawei P40, Mate 40 Pro, Xiaomi 12T Pro, Sony Xperia 10 IV, Oppo Find X3 Pro.'
      }
    },
    testimonials: {
      badge: 'Avaliações Verificadas',
      title: 'O que dizem os viajantes',
      subtitle: 'Mais de 10.000 viajantes confiam na QuieroSIM para se manterem conectados sempre.',
      reviews: [
        { name: 'Maria Laura', handle: '@marilaura89', text: 'Incrível a rapidez de tudo. Pousei em Miami e já tinha internet. Nada de trocar chips.', location: 'Viagem aos EUA' },
        { name: 'Juan Cruz', handle: '@juan_viajero', text: 'O plano de 10GB na Europa funcionou perfeitamente. O suporte me ajudou na hora quando tive uma dúvida.', location: 'Viagem para a Espanha' },
        { name: 'Carolina M.', handle: '@carom_tech', text: 'Trabalho como produtora e preciso sempre de conexão. O roaming estava estourando meu orçamento. A QuieroSIM me salvou no Chile.', location: 'Viagem ao Chile' }
      ],
      feedbackTitle: 'Você teve uma boa experiência com seu eSIM?',
      feedbackDesc: 'Trabalhamos incansavelmente para oferecer a melhor conectividade turística. Sua opinião ajuda tanto outros viajantes quanto as auditorias de satisfação dos nossos canais de pagamento.',
      feedbackBtn: 'Enviar Avaliação'
    },
    faq: {
      badge: 'Centro de Ajuda',
      title: 'Perguntas Frequentes',
      subtitle: 'Encontre as respostas que você precisa sobre nosso serviço eSIM e faturamento.',
      items: [
        { q: 'O que é um eSIM e como funciona?', a: 'Um eSIM (embedded SIM) é um cartão SIM virtual ou digital que já vem integrado no chip interno dos smartphones modernos de fábrica. Funciona como um SIM tradicional de plástico, mas não requer inserção física. Você adquire o plano móvel de forma 100% online, baixa instantaneamente escaneando um código QR recebido por e-mail e conecta-se diretamente às antenas de celular locais autorizadas no destino.' },
        { q: 'Quando devo instalar o código QR do meu eSIM?', a: 'Recomendamos escanear e instalar o código QR no seu telefone horas antes da sua viagem, enquanto você ainda tiver uma conexão WiFi estável em casa ou no aeroporto de origem. O plano não começará a consumir seus dias de validade até que você chegue ao destino e o telefone se conecte pela primeira vez à rede local.' },
        { q: 'Meu celular deve estar com o Roaming de Dados ligado?', a: 'Sim. Para que o eSIM QuieroSIM possa se conectar às redes associadas no país de destino, você deve ativar a opção "Roaming de Dados" (ou "Data Roaming") na configuração da linha eSIM instalada. Isso não gerará cobranças extras, pois é uma linha de dados pré-paga.' },
        { q: 'Posso fazer chamadas telefônicas tradicionais ou enviar SMS?', a: 'Nossos eSIMs são projetados exclusivamente para fornecer Dados Móveis (Internet). Não incluem um número de telefone tradicional para chamadas de voz ou SMS através da rede celular. No entanto, você poderá usar aplicativos como WhatsApp, FaceTime, Telegram, Skype ou iMessage normalmente para se comunicar por voz e texto usando seus dados.' },
        { q: 'O que acontece se eu consumir todos os dados do meu plano?', a: 'Se você consumir a totalidade dos Gigabytes (GB) do seu pacote antes de terminarem os dias de validade, a conexão à internet será interrompida. Sendo um serviço pré-pago, nunca cobraremos excedentes ou cobranças automáticas por uso adicional. Você pode adquirir um novo eSIM no nosso site se precisar de mais dados.' },
        { q: 'O mesmo código QR do eSIM é instalado em vários telefones?', a: 'Não. Devido a regulamentações estritas e limites técnicos internacionais de telecomunicações, cada perfil eSIM é de download único. Ele pode ser instalado apenas uma vez em um único dispositivo e permanece permanentemente vinculado a esse número de série digital. Se você decidir excluir o perfil das configurações do telefone de viagem, o código QR ficará inutilizado e não poderá ser reinstalado no mesmo ou em outro telefone.' },
        { q: 'Vocês emitem recibo ou fatura de compra?', a: 'Sim. Imediatamente após a autorização da cobrança pré-paga através da Stripe, você receberá automaticamente no seu e-mail o número do pedido e a fatura em formato corporativo PDF da QUIERO LLC, com todos os detalhes da compra.' },
        { q: 'Vocês têm suporte pós-venda?', a: 'Totalmente. Entendemos o contratempo que pode ser ficar sem conexão em uma viagem. Por isso, temos uma equipe de suporte técnico qualificada disponível 24 horas por dia, 7 dias por semana, através do e-mail support@quierosim.com ou via chat na web, prontos para resolver qualquer dúvida em minutos.' }
      ]
    },
    footer: {
      desc: 'Tecnologia eSIM para conectividade internacional imediata. Internet de alta velocidade em mais de 190 países, sem custos ocultos nem surpresas.',
      securePayment: 'Canal de pagamento seguro:',
      linksTitle: 'Links Úteis',
      links: ['Destinos Populares', 'Compatibilidade eSIM', 'Opiniões dos Clientes', 'Perguntas Frequentes'],
      supportTitle: 'Suporte e Garantia',
      rights: 'Todos os direitos reservados.',
      privacy: 'Política de Privacidade',
      terms: 'Termos de Serviço',
      refund: 'Política de Reembolso'
    },
    checkout: {
      title: 'Compra Segura eSIM',
      selectedPlan: 'Plano Selecionado',
      validFor: 'Válido por {days} dias · Ativação por QR em 2 min',
      deliveryInfo: '1. Dados de Envio',
      email: 'E-mail',
      emailHelp: 'Enviaremos o código QR de configuração do eSIM aqui imediatamente.',
      name: 'Nome Completo',
      phone: 'Telefone Celular (WhatsApp)',
      paymentInfo: '2. Informação de Pagamento (via Stripe)',
      secureSSL: 'Criptografia SSL',
      cardNumber: 'Número do Cartão',
      expiry: 'Validade',
      cvc: 'CVC / CVV',
      warning: 'Ao pressionar "Pagar hoje", você confirma que seu celular é compatível com eSIM e está desbloqueado para qualquer operadora. Pagamento único sem assinatura.',
      payBtn: 'Pagar ${price} USD Agora',
      processingTitle: 'Processando Pagamento',
      processingSub: 'Por favor, mantenha esta janela aberta. Estamos nos comunicando de forma segura com os servidores da Stripe...',
      successTitle: 'Compra Comprovada!',
      successSub: 'Enviamos sua fatura legal em USD e o manual para o seu e-mail. Seu eSIM está pronto para instalar.',
      manualCode: 'Código de Ativação Manual',
      scanInstruction: 'Escaneie o QR com a câmera do celular para baixar o perfil automaticamente.',
      installStepsTitle: 'Passos de Instalação Rápida',
      step1Title: 'Conecte ao Wi-Fi',
      step1Desc: 'Certifique-se de ter uma conexão Wi-Fi estável antes de iniciar a instalação.',
      step2Title: 'Escaneie o QR',
      step2Desc: 'Vá para Rede Celular → Adicionar Plano de Dados, e escaneie o código acima.',
      step3Title: 'Ative ao chegar',
      step3Desc: 'Ao sair do avião, marque a linha eSIM como principal e ligue o Roaming de Dados.',
      order: 'Pedido:',
      operatedBy: 'Operado legalmente por: QUIERO LLC',
      understood: 'Entendido'
    }
  }
};
export type TranslationKey = string; // Simpler to avoid huge TS types for flat dot-notation
