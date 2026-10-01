import type { LocalizedText } from "@/lib/i18n-text";
import type { TourCategory } from "./schema";

const L = (id: string, en: string): LocalizedText => ({ id, en });

const photo = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1600&q=80&auto=format&fit=crop`;

/** Verified Unsplash photos, named by what they show. */
const photos = {
  ulunDanu: photo("1537996194471-e657df975ab4"),
  ulunDanuFlowers: photo("1544644181-1484b3fdfc62"),
  ulunDanuMist: photo("1604999333679-b86d54738315"),
  tegallalang: photo("1555400038-63f5ba517a47"),
  terracesAerial: photo("1559628233-100c798642d4"),
  terracesMountain: photo("1558005530-a7958896ec60"),
  tanahLot: photo("1518548419970-58e3b4079ab2"),
  jungleRiver: photo("1552733407-5d5c46c3bb3b"),
  jungleSwing: photo("1554481923-a6918bd997bc"),
  bromoMorning: photo("1588668214407-6ea9a6d8c272"),
  bromoDusk: photo("1505993597083-3bd19fb75e57"),
  bromoValley: photo("1602154663343-89fe0bf541ab"),
  borobudurStupas: photo("1596402184320-417e7178b2cd"),
  borobudurWalk: photo("1584810359583-96fc3448beaa"),
  penidaCliffs: photo("1573790387438-4da905039392"),
  kelingking: photo("1539367628448-4bc5c9d171c8"),
  penidaCoast: photo("1577717903315-1691ae25ab3f"),
  rajaAmpatLagoon: photo("1570789210967-2cac24afeb00"),
  rajaAmpatIslands: photo("1516690561799-46d8f74f9abf"),
  feast: photo("1529928520614-7c76e2d99740"),
};

export type SeedDestination = {
  slug: string;
  name: string;
  province: string;
  tagline: LocalizedText;
  description: LocalizedText;
  heroImage: string;
};

export const destinationSeeds: SeedDestination[] = [
  {
    slug: "ubud",
    name: "Ubud",
    province: "Bali",
    heroImage: photos.tegallalang,
    tagline: L(
      "Jantung seni dan upacara Bali, di antara sawah berundak dan pura desa.",
      "The artistic and ceremonial heart of Bali, among terraced rice fields and village temples.",
    ),
    description: L(
      "Ubud tumbuh sebagai pusat seni sejak masa Puri Ubud mengundang para pelukis, penari, dan pemahat untuk berkarya. Hingga kini, hampir setiap banjar memiliki sanggar tari, kelompok gamelan, dan perajin yang mewariskan keahliannya secara turun-temurun.\n\nDi luar keramaian jalan utama, kehidupan desa tetap berputar mengikuti kalender upacara. Subak, sistem irigasi yang diakui UNESCO, mengatur air dari pura di hulu hingga petak sawah terakhir, dan menjadi cermin filosofi Tri Hita Karana.\n\nPerjalanan kami di Ubud dipandu langsung oleh warga banjar, sehingga kamu masuk sebagai tamu, bukan penonton.",
      "Ubud grew into an arts centre when the royal Puri Ubud invited painters, dancers and carvers to work here. Today almost every banjar (neighbourhood) has its own dance studio, gamelan group and craftspeople who pass their skills down through generations.\n\nAway from the busy main street, village life still turns on the ceremonial calendar. Subak, the UNESCO-listed irrigation system, carries water from upstream temples to the last rice terrace and reflects the Tri Hita Karana philosophy of harmony.\n\nOur Ubud journeys are hosted by banjar members, so you arrive as a guest rather than a spectator.",
    ),
  },
  {
    slug: "tabanan",
    name: "Tabanan",
    province: "Bali",
    heroImage: photos.ulunDanu,
    tagline: L(
      "Lumbung padi Bali, rumah bagi pura danau dan pura laut yang paling dihormati.",
      "Bali's rice bowl, home to its most revered lake and sea temples.",
    ),
    description: L(
      "Tabanan membentang dari dataran tinggi Bedugul yang sejuk hingga pesisir selatan yang berombak. Di hulu, Pura Ulun Danu Beratan memuliakan Dewi Danu, sumber air bagi sawah-sawah di bawahnya. Di hilir, Pura Tanah Lot berdiri di atas batu karang yang dikelilingi laut saat pasang.\n\nKawasan ini juga menjadi rumah bagi lanskap subak Jatiluwih, salah satu hamparan sawah berundak terluas di Bali, yang dikelola petani dengan ritme tanam yang sama selama berabad-abad.",
      "Tabanan stretches from the cool Bedugul highlands to the surf-washed southern coast. Upstream, Ulun Danu Beratan temple honours Dewi Danu, goddess of the lake that waters the fields below. Downstream, Tanah Lot rises from a rock that the tide turns into an island.\n\nThe regency is also home to the Jatiluwih subak landscape, one of Bali's widest sweeps of terraced rice, farmed to the same planting rhythm for centuries.",
    ),
  },
  {
    slug: "tengger-bromo",
    name: "Tengger Bromo",
    province: "Jawa Timur",
    heroImage: photos.bromoMorning,
    tagline: L(
      "Kaldera berkabut tempat masyarakat Tengger menjaga tradisi leluhur Majapahit.",
      "A misty caldera where the Tengger people keep their Majapahit-era traditions.",
    ),
    description: L(
      "Masyarakat Tengger mendiami lereng Pegunungan Tengger dan meyakini diri sebagai keturunan Rara Anteng dan Jaka Seger. Mereka menjalankan Hindu dengan corak yang khas, dipimpin oleh dukun pandita di setiap desa.\n\nSetiap tahun, pada bulan Kasada, warga mendaki ke bibir kawah Bromo untuk melarung hasil bumi sebagai wujud syukur. Di luar upacara, kehidupan desa berpusat pada ladang kentang dan bawang di lereng curam, rumah kayu berdapur tungku, dan sarung yang selalu terselempang menahan dingin.",
      "The Tengger people live on the slopes of the Tengger massif and trace their ancestry to Rara Anteng and Jaka Seger. They practise a distinctive form of Hinduism, guided by a dukun pandita (priest) in every village.\n\nEach year, in the month of Kasada, villagers climb to Bromo's crater rim to offer the harvest in thanksgiving. Between ceremonies, life revolves around potato and shallot fields on steep slopes, timber houses warmed by wood stoves, and the sarong always draped against the cold.",
    ),
  },
  {
    slug: "yogyakarta",
    name: "Yogyakarta",
    province: "DI Yogyakarta",
    heroImage: photos.borobudurWalk,
    tagline: L(
      "Kota keraton, batik tulis, dan candi Buddha terbesar di dunia.",
      "City of the sultan's palace, hand-drawn batik and the world's largest Buddhist temple.",
    ),
    description: L(
      "Yogyakarta adalah satu-satunya provinsi di Indonesia yang masih dipimpin oleh seorang sultan. Keraton menjadi pusat budaya Jawa: gamelan, wayang, tari klasik, dan tata krama yang halus.\n\nDi sekitar kota, kampung-kampung batik menjaga teknik tulis dengan canting dan malam, sementara di utara, Candi Borobudur menyimpan lebih dari dua ribu panel relief yang mengisahkan perjalanan menuju pencerahan.",
      "Yogyakarta is the only Indonesian province still led by a sultan. The kraton (palace) anchors Javanese culture: gamelan, wayang puppetry, classical dance and refined etiquette.\n\nAround the city, batik villages keep the canting-and-wax technique alive, while to the north Borobudur holds more than two thousand relief panels describing the path to enlightenment.",
    ),
  },
  {
    slug: "nusa-penida",
    name: "Nusa Penida",
    province: "Bali",
    heroImage: photos.kelingking,
    tagline: L(
      "Pulau tebing kapur dengan tenun rangrang dan pura-pura tua.",
      "An island of limestone cliffs, rangrang weaving and ancient temples.",
    ),
    description: L(
      "Nusa Penida dikenal lewat tebing-tebingnya yang dramatis, tetapi pulau ini juga menyimpan tradisi yang jarang dikenal. Di Desa Pejukutan, para perempuan menenun kain rangrang dengan motif geometris berlubang yang cerah, warisan yang hampir hilang sebelum dihidupkan kembali satu dekade terakhir.\n\nPulau yang kering ini juga dihormati sebagai tempat bersemayam kekuatan Dalem Ped, sehingga banyak umat Hindu dari Bali daratan datang bersembahyang.",
      "Nusa Penida is famous for its dramatic cliffs, but the island also holds lesser-known traditions. In Pejukutan village, women weave rangrang cloth with bright, open-work geometric motifs, a craft that nearly vanished before its revival over the last decade.\n\nThe dry island is also revered as the seat of Dalem Ped, drawing Hindu pilgrims from mainland Bali.",
    ),
  },
  {
    slug: "raja-ampat",
    name: "Raja Ampat",
    province: "Papua Barat Daya",
    heroImage: photos.rajaAmpatLagoon,
    tagline: L(
      "Kepulauan karst dan kampung bahari yang menjaga laut lewat sasi.",
      "Karst islands and seafaring villages that protect the sea through sasi.",
    ),
    description: L(
      "Raja Ampat berarti empat raja, merujuk pada empat pulau utama yang dulu dipimpin raja-raja lokal. Masyarakatnya hidup dari laut dan menjaga kelestariannya lewat sasi, aturan adat yang menutup wilayah tangkap tertentu dalam jangka waktu tertentu.\n\nDi kampung-kampung seperti Arborek, warga mengelola homestay, menganyam topi dan noken dari daun pandan, serta menyambut tamu dengan tarian Yospan.",
      "Raja Ampat means Four Kings, after the four main islands once ruled by local kings. Its communities live from the sea and protect it through sasi, a customary law that closes fishing grounds for set periods.\n\nIn villages such as Arborek, residents run homestays, weave hats and noken bags from pandan leaves, and welcome guests with the Yospan dance.",
    ),
  },
];

export type SeedTour = {
  slug: string;
  destination: string;
  category: TourCategory;
  title: LocalizedText;
  summary: LocalizedText;
  description: LocalizedText;
  durationDays: number;
  pricePerPerson: number;
  maxParticipants: number;
  rating: number;
  reviewCount: number;
  coverImage: string;
  gallery: string[];
  highlights: LocalizedText[];
  included: LocalizedText[];
  meetingPoint: string;
  isFeatured: boolean;
  itinerary: { title: LocalizedText; description: LocalizedText }[];
  reviews: { authorName: string; country: string; rating: number; body: LocalizedText }[];
};

const common = {
  guide: L("Pemandu lokal dari komunitas", "Local guide from the community"),
  water: L("Air mineral dan kudapan tradisional", "Bottled water and traditional snacks"),
  donation: L("Kontribusi untuk dana desa", "Contribution to the village fund"),
  sarong: L("Pinjaman kamen dan selendang", "Sarong and sash for temple visits"),
  transport: L(
    "Transportasi pulang-pergi dari titik temu",
    "Return transport from the meeting point",
  ),
};

export const tourSeeds: SeedTour[] = [
  {
    slug: "melukat-dan-jejak-subak-ubud",
    destination: "ubud",
    category: "ritual",
    title: L("Melukat dan Jejak Subak", "Melukat Blessing and the Subak Trail"),
    summary: L(
      "Ikuti upacara penyucian bersama pemangku desa, lalu telusuri saluran subak hingga pura sawah.",
      "Join a purification rite with the village priest, then follow the subak channels to a rice-field shrine.",
    ),
    description: L(
      "Pagi dimulai di sebuah pancuran suci di pinggiran Ubud. Pemangku desa akan menjelaskan makna melukat, menyiapkan canang bersama kamu, lalu memandu prosesi penyucian di bawah pancuran.\n\nSetelah berganti pakaian, kita berjalan menyusuri pematang dan saluran air bersama seorang pekaseh (ketua subak). Kamu akan melihat bagaimana air dibagi secara adil di antara petani, singgah di pura bedugul di tengah sawah, dan menutup perjalanan dengan makan siang di rumah keluarga petani.",
      "The morning begins at a sacred spring on the edge of Ubud. The village priest explains the meaning of melukat, prepares canang offerings with you, and guides the purification under the spring.\n\nAfter changing, we walk the dykes and water channels with a pekaseh, the head of the subak. You will see how water is shared fairly among farmers, stop at a bedugul shrine in the middle of the fields, and end with lunch at a farming family's home.",
    ),
    durationDays: 1,
    pricePerPerson: 850_000,
    maxParticipants: 10,
    rating: 4.9,
    reviewCount: 128,
    coverImage: photos.tegallalang,
    gallery: [
      photos.tegallalang,
      photos.terracesAerial,
      photos.jungleRiver,
      photos.terracesMountain,
    ],
    highlights: [
      L("Prosesi melukat dipandu pemangku desa", "Melukat rite guided by the village priest"),
      L("Belajar membuat canang sari", "Learn to make canang sari offerings"),
      L(
        "Berjalan di jalur subak bersama pekaseh",
        "Walk the subak with the head of the water temple",
      ),
      L("Makan siang di rumah keluarga petani", "Lunch in a farming family's home"),
    ],
    included: [
      common.guide,
      common.sarong,
      common.water,
      L("Makan siang khas Bali", "Balinese home-cooked lunch"),
      common.donation,
    ],
    meetingPoint: "Puri Saren Agung, Jl. Raya Ubud, Gianyar",
    isFeatured: true,
    itinerary: [
      {
        title: L("Pancuran suci dan pematang sawah", "Sacred spring and rice-field paths"),
        description: L(
          "07.00 bertemu di Puri Ubud, membuat canang, prosesi melukat, lalu trekking ringan 4 km mengikuti subak dan makan siang bersama keluarga petani. Selesai sekitar 14.00.",
          "07:00 meet at Puri Ubud, make offerings, melukat rite, then an easy 4 km walk along the subak and lunch with a farming family. Ends around 14:00.",
        ),
      },
    ],
    reviews: [
      {
        authorName: "Charlotte Meyer",
        country: "Germany",
        rating: 5,
        body: L(
          "Pemangku sangat sabar menjelaskan setiap langkah. Rasanya benar-benar diterima, bukan sekadar menonton.",
          "The priest patiently explained every step. We felt genuinely welcomed rather than just watching.",
        ),
      },
      {
        authorName: "Rizky Pratama",
        country: "Indonesia",
        rating: 5,
        body: L(
          "Baru tahu cara kerja subak sedetail ini. Makan siangnya juara.",
          "I'd never understood subak in this much detail. Lunch was outstanding.",
        ),
      },
      {
        authorName: "Hannah Brooks",
        country: "Australia",
        rating: 5,
        body: L(
          "Kelompok kecil, ritme santai, dan pemandu yang tulus.",
          "Small group, unhurried pace and a sincere guide.",
        ),
      },
    ],
  },
  {
    slug: "kelas-ukir-dan-lukis-batuan",
    destination: "ubud",
    category: "craft",
    title: L("Sanggar Ukir dan Lukis Batuan", "Batuan Carving and Painting Studio"),
    summary: L(
      "Sehari di sanggar keluarga seniman Batuan: belajar gaya lukis tertua di Bali dan dasar ukir kayu.",
      "A day in a Batuan artist family's studio, learning Bali's oldest painting style and woodcarving basics.",
    ),
    description: L(
      "Desa Batuan dikenal dengan gaya lukisnya yang padat detail, bertinta hitam, dan penuh adegan kehidupan sehari-hari. Kamu akan belajar langsung dari seniman generasi ketiga, mulai dari membuat sketsa, mencampur tinta, hingga teknik sigar (gradasi).\n\nSiang hari, kita berpindah ke bengkel ukir di desa tetangga untuk mencoba memahat motif patra sederhana. Karya kamu dibawa pulang.",
      "Batuan village is known for densely detailed, ink-based paintings full of everyday scenes. You will learn directly from a third-generation artist, from sketching and mixing ink to the sigar shading technique.\n\nIn the afternoon we move to a carving workshop in the next village to try a simple patra motif. You take your work home.",
    ),
    durationDays: 1,
    pricePerPerson: 650_000,
    maxParticipants: 8,
    rating: 4.8,
    reviewCount: 74,
    coverImage: photos.jungleRiver,
    gallery: [photos.jungleRiver, photos.jungleSwing, photos.terracesMountain],
    highlights: [
      L(
        "Belajar dari seniman Batuan generasi ketiga",
        "Learn from a third-generation Batuan painter",
      ),
      L("Teknik tinta dan sigar tradisional", "Traditional ink and sigar shading"),
      L("Memahat motif patra di bengkel ukir", "Carve a patra motif in a woodcarving workshop"),
      L("Bawa pulang karya sendiri", "Take your own artwork home"),
    ],
    included: [
      L("Semua bahan dan alat", "All materials and tools"),
      common.guide,
      common.water,
      L("Makan siang vegetarian", "Vegetarian lunch"),
    ],
    meetingPoint: "Pura Puseh Batuan, Sukawati, Gianyar",
    isFeatured: false,
    itinerary: [
      {
        title: L("Lukis Batuan dan ukir kayu", "Batuan painting and woodcarving"),
        description: L(
          "09.00 sesi lukis di sanggar, 12.30 makan siang, 13.30 sesi ukir, 16.00 berbagi karya dan selesai.",
          "09:00 painting session at the studio, 12:30 lunch, 13:30 carving session, 16:00 share your work and finish.",
        ),
      },
    ],
    reviews: [
      {
        authorName: "Yuki Tanaka",
        country: "Japan",
        rating: 5,
        body: L(
          "Detail lukisan Batuan luar biasa. Saya pulang dengan rasa hormat yang baru.",
          "The detail of Batuan painting is remarkable. I left with a new respect for it.",
        ),
      },
      {
        authorName: "Lucas Martin",
        country: "France",
        rating: 4,
        body: L(
          "Sangat menyenangkan, meski sesi ukirnya terasa singkat.",
          "Great fun, though the carving session felt short.",
        ),
      },
    ],
  },
  {
    slug: "dapur-desa-keluarga-bali",
    destination: "ubud",
    category: "culinary",
    title: L(
      "Dapur Desa: Masak Bersama Keluarga Bali",
      "Village Kitchen: Cooking with a Balinese Family",
    ),
    summary: L(
      "Belanja di pasar pagi, lalu memasak lawar, sate lilit, dan base genep di dapur keluarga.",
      "Shop at the morning market, then cook lawar, sate lilit and base genep in a family kitchen.",
    ),
    description: L(
      "Masakan Bali berangkat dari base genep, bumbu dasar yang diulek dari belasan rempah. Bersama Ibu Made dan keluarganya, kamu akan belanja di pasar desa, mengenal bahan-bahan lokal, lalu memasak di dapur tradisional berlantai tanah.\n\nKita menutup hari dengan makan bersama dan obrolan tentang peran makanan dalam upacara, dari banten hingga megibung.",
      "Balinese cooking starts with base genep, a paste ground from more than a dozen spices. With Ibu Made and her family, you will shop at the village market, get to know local ingredients, then cook in a traditional earth-floored kitchen.\n\nWe end the day eating together and talking about food's role in ceremonies, from offerings to megibung communal feasts.",
    ),
    durationDays: 1,
    pricePerPerson: 550_000,
    maxParticipants: 8,
    rating: 4.9,
    reviewCount: 203,
    coverImage: photos.feast,
    gallery: [photos.feast, photos.terracesAerial, photos.tegallalang],
    highlights: [
      L("Belanja bahan di pasar desa", "Shop for ingredients at the village market"),
      L("Mengulek base genep dari nol", "Grind base genep from scratch"),
      L("Masak lima hidangan khas Bali", "Cook five Balinese dishes"),
      L("Buku resep dwibahasa", "Bilingual recipe booklet"),
    ],
    included: [
      L("Semua bahan masakan", "All ingredients"),
      L("Makan bersama keluarga", "Shared meal with the family"),
      common.transport,
      L("Buku resep", "Recipe booklet"),
    ],
    meetingPoint: "Pasar Ubud, Jl. Raya Ubud, Gianyar",
    isFeatured: true,
    itinerary: [
      {
        title: L("Pasar pagi dan dapur keluarga", "Morning market and family kitchen"),
        description: L(
          "07.30 pasar desa, 09.00 tiba di rumah keluarga, memasak hingga 12.30, lalu makan bersama.",
          "07:30 village market, 09:00 arrive at the family home, cook until 12:30, then eat together.",
        ),
      },
    ],
    reviews: [
      {
        authorName: "Emily Carter",
        country: "United Kingdom",
        rating: 5,
        body: L(
          "Sate lilit terbaik yang pernah saya makan, dan saya ikut membuatnya.",
          "The best sate lilit I've ever had, and I helped make it.",
        ),
      },
      {
        authorName: "Daniel Kim",
        country: "South Korea",
        rating: 5,
        body: L(
          "Keluarganya hangat sekali. Anak-anak ikut membantu di dapur.",
          "Such a warm family. The kids joined in the kitchen.",
        ),
      },
      {
        authorName: "Sari Wulandari",
        country: "Indonesia",
        rating: 5,
        body: L(
          "Penjelasan tentang banten dan makanan upacara sangat membuka wawasan.",
          "The explanation of offerings and ceremonial food was eye-opening.",
        ),
      },
    ],
  },
  {
    slug: "pura-ulun-danu-upacara-danau",
    destination: "tabanan",
    category: "ritual",
    title: L(
      "Pura Ulun Danu dan Persembahan untuk Danau",
      "Ulun Danu Temple and Offerings to the Lake",
    ),
    summary: L(
      "Pahami hubungan danau, pura, dan sawah bersama pemangku di Bedugul, lalu sambut senja di Tanah Lot.",
      "Understand the bond between lake, temple and rice field with a Bedugul priest, then greet sunset at Tanah Lot.",
    ),
    description: L(
      "Perjalanan ini menelusuri air dari hulu ke hilir. Di tepi Danau Beratan, pemangku menjelaskan peran Pura Ulun Danu dalam sistem subak dan mengajak kamu menyiapkan persembahan sederhana.\n\nSore harinya, kita turun ke pesisir Tabanan untuk menyaksikan umat bersembahyang di Pura Tanah Lot saat matahari terbenam, sambil mendengar kisah Dang Hyang Nirartha.",
      "This journey follows water from source to sea. On the shore of Lake Beratan, a priest explains Ulun Danu's role in the subak system and invites you to prepare a simple offering.\n\nIn the afternoon we descend to the Tabanan coast to watch worshippers at Tanah Lot as the sun sets, hearing the story of the priest Dang Hyang Nirartha.",
    ),
    durationDays: 1,
    pricePerPerson: 750_000,
    maxParticipants: 12,
    rating: 4.7,
    reviewCount: 96,
    coverImage: photos.ulunDanuFlowers,
    gallery: [photos.ulunDanuFlowers, photos.ulunDanuMist, photos.ulunDanu, photos.tanahLot],
    highlights: [
      L("Dialog dengan pemangku Pura Ulun Danu", "Conversation with an Ulun Danu temple priest"),
      L("Menyiapkan persembahan untuk Dewi Danu", "Prepare an offering for the lake goddess"),
      L("Pasar buah dan bunga Bedugul", "Bedugul fruit and flower market"),
      L("Senja di Pura Tanah Lot", "Sunset at Tanah Lot temple"),
    ],
    included: [
      common.guide,
      common.sarong,
      common.transport,
      L("Tiket masuk pura", "Temple entrance fees"),
      L("Makan siang di warung lokal", "Lunch at a local warung"),
    ],
    meetingPoint: "Lobi hotel di area Ubud, Canggu, atau Seminyak",
    isFeatured: false,
    itinerary: [
      {
        title: L("Dari danau ke laut", "From lake to sea"),
        description: L(
          "08.00 penjemputan, 10.00 Pura Ulun Danu dan dialog dengan pemangku, 12.30 pasar Bedugul dan makan siang, 16.30 Tanah Lot, 19.30 kembali ke hotel.",
          "08:00 pickup, 10:00 Ulun Danu and conversation with the priest, 12:30 Bedugul market and lunch, 16:30 Tanah Lot, 19:30 back at your hotel.",
        ),
      },
    ],
    reviews: [
      {
        authorName: "Sofia Rossi",
        country: "Italy",
        rating: 5,
        body: L(
          "Penjelasan tentang air dan pura membuat semuanya terasa terhubung.",
          "The explanation of water and temples made everything connect.",
        ),
      },
      {
        authorName: "Michael Chen",
        country: "Singapore",
        rating: 4,
        body: L(
          "Tanah Lot ramai, tapi pemandu tahu sudut yang tenang.",
          "Tanah Lot was busy, but our guide knew the quiet corners.",
        ),
      },
    ],
  },
  {
    slug: "trekking-subak-jatiluwih",
    destination: "tabanan",
    category: "trekking",
    title: L("Trekking Subak Jatiluwih", "Jatiluwih Subak Trek"),
    summary: L(
      "Jelajah 8 km di lanskap warisan dunia, dari hutan Batukaru hingga hamparan sawah berundak.",
      "An 8 km walk through a World Heritage landscape, from Batukaru forest to sweeping rice terraces.",
    ),
    description: L(
      "Jatiluwih adalah bagian dari Lanskap Budaya Provinsi Bali yang ditetapkan UNESCO. Jalur ini dimulai dari tepi hutan di kaki Gunung Batukaru, melewati kebun kakao dan kopi, lalu turun ke hamparan sawah yang masih ditanami padi merah lokal.\n\nKita singgah di rumah petani untuk mencicipi teh beras merah dan belajar tentang kalender tanam yang mengikuti upacara di pura subak.",
      "Jatiluwih is part of UNESCO's Cultural Landscape of Bali Province. The trail starts at the forest edge below Mount Batukaru, passes cacao and coffee gardens, then drops into terraces still planted with local red rice.\n\nWe stop at a farmer's home to taste red-rice tea and learn how the planting calendar follows ceremonies at the subak temple.",
    ),
    durationDays: 1,
    pricePerPerson: 700_000,
    maxParticipants: 10,
    rating: 4.8,
    reviewCount: 58,
    coverImage: photos.terracesMountain,
    gallery: [photos.terracesMountain, photos.terracesAerial, photos.tegallalang],
    highlights: [
      L("Lanskap subak warisan dunia UNESCO", "UNESCO World Heritage subak landscape"),
      L("Jalur hutan, kebun, dan sawah", "Forest, garden and rice-field trail"),
      L("Mencicipi teh beras merah", "Taste red-rice tea"),
      L("Makan siang dengan bahan dari kebun", "Garden-to-table lunch"),
    ],
    included: [
      common.guide,
      common.transport,
      common.water,
      L("Tongkat trekking", "Trekking poles"),
      common.donation,
    ],
    meetingPoint: "Pos informasi Jatiluwih, Penebel, Tabanan",
    isFeatured: false,
    itinerary: [
      {
        title: L("Hutan Batukaru ke sawah Jatiluwih", "Batukaru forest to Jatiluwih terraces"),
        description: L(
          "07.00 penjemputan, 09.00 mulai trekking (sekitar 3,5 jam, tingkat sedang), 13.00 makan siang di rumah petani, 15.30 kembali.",
          "07:00 pickup, 09:00 start trekking (about 3.5 hours, moderate), 13:00 lunch at a farmer's home, 15:30 return.",
        ),
      },
    ],
    reviews: [
      {
        authorName: "Tom Andersen",
        country: "Norway",
        rating: 5,
        body: L(
          "Pemandangan luar biasa dan hampir tidak bertemu turis lain.",
          "Incredible views and we barely saw other tourists.",
        ),
      },
      {
        authorName: "Ayu Lestari",
        country: "Indonesia",
        rating: 5,
        body: L(
          "Pemandunya petani asli Jatiluwih, ceritanya sangat personal.",
          "Our guide is a Jatiluwih farmer, so the stories were very personal.",
        ),
      },
    ],
  },
  {
    slug: "kasada-dan-fajar-bromo",
    destination: "tengger-bromo",
    category: "ritual",
    title: L("Tradisi Tengger dan Fajar di Bromo", "Tengger Traditions and Dawn at Bromo"),
    summary: L(
      "Menginap di rumah warga Tengger, belajar tentang Kasada dari dukun pandita, dan menyambut fajar di Penanjakan.",
      "Stay with a Tengger family, learn about Kasada from the village priest, and greet dawn at Penanjakan.",
    ),
    description: L(
      "Perjalanan dua hari ini membawa kamu ke desa Tengger di bibir kaldera. Kamu menginap di rumah keluarga, menghangatkan diri di depan tungku, dan berbincang dengan dukun pandita tentang makna Yadnya Kasada dan Karo.\n\nDini hari, kita berangkat ke Penanjakan untuk melihat matahari terbit di atas lautan pasir, lalu berjalan ke kawah Bromo melewati Pura Luhur Poten. Jika jadwal bertepatan dengan Kasada, kamu akan menyaksikan upacara dari jarak yang dihormati.",
      "This two-day journey takes you to a Tengger village on the caldera rim. You stay with a family, warm up by the wood stove, and talk with the dukun pandita about the meaning of the Kasada and Karo ceremonies.\n\nBefore dawn we head to Penanjakan to watch the sun rise over the sea of sand, then walk to Bromo's crater past Luhur Poten temple. If your dates coincide with Kasada, you will witness the ceremony from a respectful distance.",
    ),
    durationDays: 2,
    pricePerPerson: 2_400_000,
    maxParticipants: 8,
    rating: 4.9,
    reviewCount: 141,
    coverImage: photos.bromoMorning,
    gallery: [photos.bromoMorning, photos.bromoDusk, photos.bromoValley],
    highlights: [
      L("Menginap di rumah keluarga Tengger", "Homestay with a Tengger family"),
      L("Dialog dengan dukun pandita", "Conversation with the village priest"),
      L("Matahari terbit di Penanjakan", "Sunrise at Penanjakan viewpoint"),
      L(
        "Berjalan ke kawah melewati Pura Luhur Poten",
        "Walk to the crater past Luhur Poten temple",
      ),
    ],
    included: [
      L("Homestay 1 malam", "1-night homestay"),
      L("Jip 4x4 ke Penanjakan", "4x4 jeep to Penanjakan"),
      L("Makan 3 kali", "3 meals"),
      common.guide,
      L("Tiket taman nasional", "National park fees"),
    ],
    meetingPoint: "Stasiun Malang Kota Baru, Malang",
    isFeatured: true,
    itinerary: [
      {
        title: L("Menuju desa Tengger", "Into the Tengger highlands"),
        description: L(
          "13.00 berangkat dari Malang, 16.00 tiba di desa, jalan sore di ladang, makan malam dan dialog dengan dukun pandita.",
          "13:00 leave Malang, 16:00 arrive in the village, afternoon walk through the fields, dinner and conversation with the priest.",
        ),
      },
      {
        title: L("Fajar di Penanjakan dan kawah Bromo", "Dawn at Penanjakan and Bromo crater"),
        description: L(
          "03.30 jip ke Penanjakan, 05.15 matahari terbit, 07.00 berjalan ke kawah, 09.30 sarapan di rumah keluarga, 13.00 tiba kembali di Malang.",
          "03:30 jeep to Penanjakan, 05:15 sunrise, 07:00 walk to the crater, 09:30 breakfast with the family, 13:00 back in Malang.",
        ),
      },
    ],
    reviews: [
      {
        authorName: "Olivia Johnson",
        country: "United States",
        rating: 5,
        body: L(
          "Malam di depan tungku bersama keluarga Tengger adalah momen terbaik perjalanan saya.",
          "The evening by the stove with a Tengger family was the highlight of my trip.",
        ),
      },
      {
        authorName: "Budi Santoso",
        country: "Indonesia",
        rating: 5,
        body: L(
          "Penjelasan tentang Kasada sangat mendalam dan disampaikan dengan hormat.",
          "The explanation of Kasada was deep and respectfully delivered.",
        ),
      },
      {
        authorName: "Noah Fischer",
        country: "Switzerland",
        rating: 5,
        body: L("Dingin, tapi fajarnya tidak terlupakan.", "Cold, but an unforgettable dawn."),
      },
    ],
  },
  {
    slug: "jejak-desa-ngadas",
    destination: "tengger-bromo",
    category: "village",
    title: L("Tiga Hari di Desa Ngadas", "Three Days in Ngadas Village"),
    summary: L(
      "Hidup bersama warga desa tertinggi di Jawa: bertani di lereng, memasak di tungku, dan mengikuti doa desa.",
      "Live with the people of Java's highest village: farm the slopes, cook on the stove and join village prayers.",
    ),
    description: L(
      "Ngadas berada di ketinggian lebih dari 2.000 meter dan menjadi salah satu desa adat Tengger yang masih memegang aturan leluhur. Selama tiga hari, kamu ikut ke ladang, membantu memanen sayur, dan belajar memasak jenang dan nasi aron di dapur tungku.\n\nMalam terakhir, jika ada kegiatan adat, kamu diundang mengikuti doa bersama di sanggar pamujan desa.",
      "At over 2,000 metres, Ngadas is one of the Tengger customary villages that still follows ancestral rules. Over three days you join the family in the fields, help harvest vegetables and learn to cook jenang and nasi aron on the wood stove.\n\nOn the last night, if there is a village observance, you are invited to join the communal prayer at the village shrine.",
    ),
    durationDays: 3,
    pricePerPerson: 3_100_000,
    maxParticipants: 6,
    rating: 4.8,
    reviewCount: 37,
    coverImage: photos.bromoValley,
    gallery: [photos.bromoValley, photos.bromoDusk, photos.bromoMorning],
    highlights: [
      L("Desa adat di ketinggian 2.000 m", "Customary village at 2,000 m"),
      L("Bertani bersama keluarga", "Farm alongside your host family"),
      L("Memasak di dapur tungku", "Cook on a traditional wood stove"),
      L("Kelompok maksimal enam orang", "Groups of six at most"),
    ],
    included: [
      L("Homestay 2 malam", "2-night homestay"),
      L("Semua makan", "All meals"),
      common.guide,
      common.transport,
      common.donation,
    ],
    meetingPoint: "Terminal Arjosari, Malang",
    isFeatured: false,
    itinerary: [
      {
        title: L("Tiba di Ngadas", "Arrive in Ngadas"),
        description: L(
          "Perjalanan dari Malang, perkenalan dengan keluarga, jalan sore keliling desa.",
          "Drive from Malang, meet your family, evening walk around the village.",
        ),
      },
      {
        title: L("Hari di ladang", "A day in the fields"),
        description: L(
          "Berangkat ke ladang bersama keluarga, makan siang di gubuk ladang, sore belajar memasak.",
          "Head to the fields with the family, lunch in the field hut, cooking lesson in the afternoon.",
        ),
      },
      {
        title: L("Pamit", "Farewell"),
        description: L(
          "Fajar di bukit desa, sarapan perpisahan, kembali ke Malang.",
          "Dawn on the village hill, farewell breakfast, return to Malang.",
        ),
      },
    ],
    reviews: [
      {
        authorName: "Grace Lee",
        country: "Canada",
        rating: 5,
        body: L(
          "Benar-benar lambat dan autentik. Saya merasa seperti bagian dari keluarga.",
          "Truly slow and authentic. I felt like part of the family.",
        ),
      },
      {
        authorName: "Pieter de Vries",
        country: "Netherlands",
        rating: 4,
        body: L(
          "Dingin di malam hari, bawa jaket tebal. Pengalaman yang luar biasa.",
          "Cold at night, bring a warm jacket. A remarkable experience.",
        ),
      },
    ],
  },
  {
    slug: "borobudur-fajar-dan-batik-tulis",
    destination: "yogyakarta",
    category: "craft",
    title: L("Fajar Borobudur dan Batik Tulis", "Borobudur at Dawn and Hand-drawn Batik"),
    summary: L(
      "Membaca relief Borobudur bersama pemandu desa, lalu membatik dengan canting di kampung batik Yogyakarta.",
      "Read Borobudur's reliefs with a village guide, then draw batik with a canting in a Yogyakarta batik village.",
    ),
    description: L(
      "Hari pertama dimulai sebelum fajar di bukit sekitar Borobudur, lalu berjalan bersama pemandu dari desa sekitar candi untuk membaca relief Karmawibhangga hingga Lalitavistara. Sore harinya kita bersepeda melintasi desa-desa di Lembah Menoreh.\n\nHari kedua dihabiskan di kampung batik. Seorang pembatik senior akan mengajarkan filosofi motif keraton seperti parang dan kawung, lalu memandu kamu membatik selembar kain dari pola hingga pewarnaan.",
      "Day one begins before dawn on a hill near Borobudur, followed by a walk with a guide from the surrounding villages to read the reliefs, from Karmawibhangga to Lalitavistara. In the afternoon we cycle through the villages of the Menoreh valley.\n\nDay two is spent in a batik village. A senior batik maker teaches the philosophy of court motifs such as parang and kawung, then guides you through making your own cloth from pattern to dye.",
    ),
    durationDays: 2,
    pricePerPerson: 1_900_000,
    maxParticipants: 10,
    rating: 4.9,
    reviewCount: 167,
    coverImage: photos.borobudurWalk,
    gallery: [photos.borobudurWalk, photos.borobudurStupas, photos.feast],
    highlights: [
      L("Fajar di perbukitan Menoreh", "Dawn over the Menoreh hills"),
      L("Membaca relief bersama pemandu desa", "Read the reliefs with a village guide"),
      L("Bersepeda di desa sekitar candi", "Cycle through villages around the temple"),
      L("Membatik selembar kain sendiri", "Make your own batik cloth"),
    ],
    included: [
      L("Menginap 1 malam di guesthouse desa", "1 night in a village guesthouse"),
      L("Tiket Candi Borobudur", "Borobudur entrance ticket"),
      L("Kelas batik dan bahan", "Batik class and materials"),
      common.guide,
      L("Makan 4 kali", "4 meals"),
    ],
    meetingPoint: "Stasiun Tugu Yogyakarta",
    isFeatured: true,
    itinerary: [
      {
        title: L("Borobudur dan Lembah Menoreh", "Borobudur and the Menoreh valley"),
        description: L(
          "04.00 berangkat, fajar di bukit, 07.30 tur relief, sore bersepeda desa, menginap di guesthouse.",
          "04:00 depart, dawn on the hill, 07:30 relief walk, afternoon village cycling, overnight in a guesthouse.",
        ),
      },
      {
        title: L("Kampung batik", "Batik village"),
        description: L(
          "09.00 kelas batik tulis hingga 15.00, termasuk pewarnaan dan pelorodan, lalu kembali ke Yogyakarta.",
          "09:00 hand-drawn batik class until 15:00, including dyeing and wax removal, then return to Yogyakarta.",
        ),
      },
    ],
    reviews: [
      {
        authorName: "Isabella Garcia",
        country: "Spain",
        rating: 5,
        body: L(
          "Membaca relief bersama pemandu lokal mengubah cara saya melihat Borobudur.",
          "Reading the reliefs with a local guide changed how I see Borobudur.",
        ),
      },
      {
        authorName: "Ahmad Fauzi",
        country: "Malaysia",
        rating: 5,
        body: L(
          "Kelas batiknya sabar dan detail. Kain saya tidak sempurna, tapi saya bangga.",
          "The batik class was patient and detailed. My cloth isn't perfect, but I'm proud of it.",
        ),
      },
      {
        authorName: "Chloe Dubois",
        country: "Belgium",
        rating: 5,
        body: L(
          "Kombinasi sempurna antara sejarah dan kerajinan.",
          "The perfect mix of history and craft.",
        ),
      },
    ],
  },
  {
    slug: "tenun-rangrang-dan-tebing-penida",
    destination: "nusa-penida",
    category: "craft",
    title: L("Tenun Rangrang dan Tebing Penida", "Rangrang Weaving and the Penida Cliffs"),
    summary: L(
      "Belajar menenun rangrang bersama perempuan Pejukutan, lalu menyusuri tebing selatan pulau.",
      "Learn rangrang weaving with the women of Pejukutan, then explore the island's southern cliffs.",
    ),
    description: L(
      "Rangrang adalah tenun khas Nusa Penida dengan motif belah ketupat yang terbuka dan warna-warna berani. Di Desa Pejukutan, kelompok penenun perempuan akan memperkenalkan alat tenun cagcag dan mengajak kamu mencoba beberapa baris tenunan.\n\nHari kedua, kita menjelajah sisi selatan pulau: Kelingking, Pantai Diamond, dan pura di tebing, dengan pemandu yang lahir dan besar di Penida.",
      "Rangrang is Nusa Penida's signature weaving, with open diamond motifs and bold colours. In Pejukutan village, a women's weaving group introduces the cagcag backstrap loom and invites you to weave a few rows.\n\nOn day two we explore the island's south side, Kelingking, Diamond Beach and a cliff-top temple, with a guide born and raised on Penida.",
    ),
    durationDays: 2,
    pricePerPerson: 1_600_000,
    maxParticipants: 8,
    rating: 4.7,
    reviewCount: 49,
    coverImage: photos.kelingking,
    gallery: [photos.kelingking, photos.penidaCliffs, photos.penidaCoast],
    highlights: [
      L("Belajar menenun bersama kelompok perempuan", "Weave with a women's cooperative"),
      L("Mengenal pewarna alami", "Discover natural dyes"),
      L("Tebing Kelingking dan Pantai Diamond", "Kelingking cliff and Diamond Beach"),
      L("Pemandu asli Nusa Penida", "Guide native to Nusa Penida"),
    ],
    included: [
      L("Fast boat pulang-pergi dari Sanur", "Return fast boat from Sanur"),
      L("Homestay 1 malam", "1-night homestay"),
      L("Kelas tenun", "Weaving class"),
      common.guide,
      L("Makan 3 kali", "3 meals"),
    ],
    meetingPoint: "Pelabuhan Sanur, Denpasar",
    isFeatured: true,
    itinerary: [
      {
        title: L("Pejukutan dan tenun rangrang", "Pejukutan and rangrang weaving"),
        description: L(
          "08.00 fast boat dari Sanur, kelas tenun hingga sore, makan malam di homestay.",
          "08:00 fast boat from Sanur, weaving class until late afternoon, dinner at the homestay.",
        ),
      },
      {
        title: L("Tebing selatan", "The southern cliffs"),
        description: L(
          "Kelingking dan Pantai Diamond di pagi hari, makan siang, fast boat kembali sekitar 16.00.",
          "Kelingking and Diamond Beach in the morning, lunch, fast boat back around 16:00.",
        ),
      },
    ],
    reviews: [
      {
        authorName: "Mia Schneider",
        country: "Austria",
        rating: 5,
        body: L(
          "Para penenun luar biasa ramah. Sekarang saya mengerti kenapa kain ini begitu berharga.",
          "The weavers were wonderfully kind. Now I understand why this cloth is so precious.",
        ),
      },
      {
        authorName: "James Wilson",
        country: "New Zealand",
        rating: 4,
        body: L(
          "Jalan menuju tebing cukup berat, tapi sepadan.",
          "The road to the cliffs is rough, but worth it.",
        ),
      },
    ],
  },
  {
    slug: "kampung-arborek-raja-ampat",
    destination: "raja-ampat",
    category: "village",
    title: L(
      "Kampung Arborek: Hidup Bersama Masyarakat Bahari",
      "Arborek Village: Life with a Seafaring Community",
    ),
    summary: L(
      "Lima hari di homestay kampung: menganyam pandan, belajar sasi, snorkeling di karang yang dijaga adat.",
      "Five days in a village homestay: weave pandan, learn about sasi and snorkel reefs protected by custom.",
    ),
    description: L(
      "Arborek adalah kampung kecil di tengah gugusan Raja Ampat yang dikenal karena komitmennya menjaga laut. Kamu menginap di homestay yang dikelola warga, ikut mama-mama menganyam topi dan noken dari pandan, dan belajar bagaimana sasi melindungi karang dan ikan.\n\nSetiap hari ada waktu untuk snorkeling di karang depan kampung, berperahu ke laguna Pianemo, dan mendengar cerita asal-usul empat raja dari tetua adat.",
      "Arborek is a small village in the heart of Raja Ampat, known for its commitment to protecting the sea. You stay in a community-run homestay, weave hats and noken bags from pandan with the village women, and learn how sasi protects reefs and fish.\n\nEach day includes time to snorkel the house reef, boat to the Pianemo lagoon, and hear the origin story of the four kings from a village elder.",
    ),
    durationDays: 5,
    pricePerPerson: 12_500_000,
    maxParticipants: 6,
    rating: 5.0,
    reviewCount: 22,
    coverImage: photos.rajaAmpatLagoon,
    gallery: [photos.rajaAmpatLagoon, photos.rajaAmpatIslands],
    highlights: [
      L("Homestay yang dikelola kampung", "Community-run homestay"),
      L("Menganyam pandan bersama mama-mama", "Weave pandan with the village women"),
      L("Belajar tentang sasi dari tetua adat", "Learn about sasi from an elder"),
      L("Laguna Pianemo dan snorkeling karang", "Pianemo lagoon and reef snorkelling"),
    ],
    included: [
      L("Homestay 4 malam", "4-night homestay"),
      L("Semua makan", "All meals"),
      L("Kapal antar pulau", "Inter-island boat"),
      L("Kartu masuk Raja Ampat", "Raja Ampat entry permit"),
      common.guide,
      common.donation,
    ],
    meetingPoint: "Pelabuhan Rakyat Sorong",
    isFeatured: true,
    itinerary: [
      {
        title: L("Sorong ke Arborek", "Sorong to Arborek"),
        description: L(
          "Kapal dari Sorong via Waisai, sambutan tarian Yospan, snorkeling sore.",
          "Boat from Sorong via Waisai, Yospan welcome dance, afternoon snorkel.",
        ),
      },
      {
        title: L("Anyaman pandan", "Pandan weaving"),
        description: L(
          "Pagi menganyam bersama mama-mama, siang snorkeling di karang depan kampung.",
          "Morning weaving with the women, afternoon snorkel on the house reef.",
        ),
      },
      {
        title: L("Laguna Pianemo", "Pianemo lagoon"),
        description: L(
          "Perahu ke Pianemo, mendaki ke titik pandang, makan siang di pantai.",
          "Boat to Pianemo, climb to the viewpoint, beach lunch.",
        ),
      },
      {
        title: L("Sasi dan cerita tetua", "Sasi and the elder's stories"),
        description: L(
          "Belajar sasi, mengunjungi area tangkap yang ditutup, malam cerita bersama tetua adat.",
          "Learn about sasi, visit a closed fishing ground, evening stories with an elder.",
        ),
      },
      {
        title: L("Kembali ke Sorong", "Return to Sorong"),
        description: L(
          "Sarapan perpisahan dan kapal kembali ke Sorong.",
          "Farewell breakfast and boat back to Sorong.",
        ),
      },
    ],
    reviews: [
      {
        authorName: "Ethan Walker",
        country: "United States",
        rating: 5,
        body: L(
          "Karangnya luar biasa, tapi yang paling berkesan adalah keramahan warga Arborek.",
          "The reefs are stunning, but what stayed with me was Arborek's hospitality.",
        ),
      },
      {
        authorName: "Lea Hoffmann",
        country: "Germany",
        rating: 5,
        body: L(
          "Belajar tentang sasi membuat saya melihat konservasi dengan cara baru.",
          "Learning about sasi changed how I think about conservation.",
        ),
      },
    ],
  },
];
