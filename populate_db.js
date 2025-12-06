const admin = require('firebase-admin');

const serviceAccount = {
  "type": "service_account",
  "project_id": "kuar-tor-portal",
  "private_key_id": "e75b171b0fce20cb2ab9ddc09d84bfcd2203b1a4",
  "private_key": `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDnpnlV5rXWgWbU
JuQhk+3D+VpYbHKgVuVyUMa2pHJ0Jl7Zs7Gto98X7vdP2i64QxwpHAdx2kyTOwbr
xqGFs3Lq4kth1W8lavgMnYoXpZ2tIhY/uxFEG06m8PEepnmbmaXpjcUCD3H48Izg
TK3QhazvsKS64NRcFkS50TIZCxsxvZsI1dxOlzllX7PW80PC7EKQAd6i6S3uOX/S
hVZJ+epV9s0zb7GQ3TdyFZVTvSOa+lrOMECxggJ3q4w+9xHn0sxjtMhnOTNXAK53
zMcvma8AlwwsAFOcKyACo1x9tMBJPhY6KriamWMa8r7jsUWF4Duc2TofB6WziJzY
nKl99KVpAgMBAAECggEACIPVB/RQEM924SuAzT8ryT1cNc3etMgc7QPNGh+XWW+j
our5CAHzDGUrUBMcDofg/B3cpDG7CNptmbMWctyyx7GDxdfbmwuAjK4pyk67KgcL
vFH7A37heD95DYBfDfoq4Bfm+vloXhcxhnkrFnQjdDgRBhGHnM7wvcfTyJng6QYW
SH5yZ9BO0zKoocBOToE3HGmHTyZPEg4bzHX+f9xXHikyI4RAqd8BXWCT0EJsXa9r
naMsD+u/eRg9s3ZD0Js4KGzIZhdNR0jYUP2Ywnqa9wbWskHT32SoDXzDpRtrZ4VAB
dl56RfI0lxEjLKxkFKXC+m9O/S7JJDgE4RHv5w/09QKBgQD7JKGgw8eaMBHZhwO4
Yrai2svBAUBUMUJ0DZbPMYuFTaaD9FemyfuP8F0I7EtuuwqGrxNFQXxJLByx9hvl
fpNKJjkmC3KUDwcXsHaK1TcuK558+OVKl6jn002s26+JZwK/iqFx0b/rEHjoK2Im
jR4Vlm26ElokpKgjIXbwOfPR/wKBgQDsIVY/w+hQhBqLGVIMgwKMubaEbU9Zbw0q
UGCp94FQC1ywCc/d6ydyi2W+yuLQz86OfkjJ6/J3hdMw5OCEUg+ykTNLptFkkJEU
H8/N9Q5BCmDHggGazbBjoHrvvMlOq59BLgBw7ZFBfxTAh682qlloa/tXnYuR9Ery
G5cdXsw4lwKBgD8bUVHoYDuqYJHcj17Bz0rU1+ZDvjpptl0bHQ4rUPfKL1FxEKVk
k8XzjC010y6b6WU2kQ0SC30HjJ5bTV85kyFKwYmBzuTNcebN/LueIT52R3j3wgYg
Xd0DB72r5kwMinA/EZpcLnGOzhLo89zkEO8zwZbEDcqvZWCOhCiRJ2dZAoGBAMBT
Ks/G/jpOTtxK5FRChNogDTPxYHbkh6GWVBU7/Xw3tOfBJiiHdtrKBTYQRAt1prTS
0PB+GEAXpPsnAGNl/1kfANu2ZMh3I2Nzwarr1Q9Op6L4FdyDeg67UEZhyskj6hOJ
p1xTc0MYgcuK+EAbIbV2dgJX1K0tf7mQlVWbt9TDAoGADHpPjGhZXE5TYFiyLKB3
v2wqb1e0Q2HC0/Y2tw5l1vKCPE+2EpvpnkMa8uEqqzX6Jb/jFNSx7GAZT0yI+Jxj
1tQ0LTvOaP3DJ4JQtx6Z9MpWUgY7TXPmqi1qNwPp3foyjh8a1jZ1xn9dDFjNXFON
VPuzyoSytaH9ygiWSzIh3Z0=
-----END PRIVATE KEY-----`,
  "client_email": "firebase-adminsdk-fbsvc@kuar-tor-portal.iam.gserviceaccount.com",
  "client_id": "109885213693290782656",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40kuar-tor-portal.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const estadoGlobal = {
    fundosComunitarios: 50000,
    rooms: {
        forja: { name: "Forja", cost: 0, unlocked: true, npcId: 'bruza', icon: 'Hammer' },
        cozinha: { name: "Cozinha", cost: 0, unlocked: true, npcId: 'lucerina', icon: 'Soup' },
        biblioteca: { name: "Biblioteca", cost: 0, unlocked: true, npcId: 'rayllum', icon: 'BookOpen' },
        alquimia: { name: "Lab. de Alquimia", cost: 2000, unlocked: true, npcId: 'miranda', icon: 'FlaskConical' },
        prazeres: { name: "Casa dos Prazeres", cost: 3000, unlocked: true, npcId: 'eveline', isLust: true, icon: 'Heart' },
        mercado: { name: "Mercado Negro", cost: 0, unlocked: true, npcId: 'corvus', icon: 'Scale' },
        engenheiros: { name: "Lab. dos Engenheiros", cost: 1500, unlocked: false, npcId: null, icon: 'Cog' },
        magias: { name: "Lab. das Magias", cost: 1000, unlocked: false, npcId: null, icon: 'Sparkles' },
        enfermaria: { name: "Enfermaria", cost: 3000, unlocked: false, npcId: null, icon: 'PlusSquare' },
        mineracao: { name: "Posto de Mineração", cost: 2000, unlocked: false, npcId: null, icon: 'Pickaxe' },
        estufa: { name: "Estufa Alquímica", cost: 2000, unlocked: false, npcId: null, icon: 'Leaf' },
        mercador: { name: "Portal do Mercador", cost: -1, unlocked: false, npcId: null, icon: 'Gateway' },
        missoes: { name: "Quadro de Missões", cost: 0, unlocked: true, npcId: null, icon: 'ClipboardList' }
    },
    npcs: {
        bruza: { name: "Bruza, o Ferreiro", title: `"Aço e fogo. É tudo que resta."`, description: "Um mestre de seu ofício, Bruza pode transformar sucata em lâminas mortais.", image: "https://placehold.co/100x100/2a2a2a/c5a173?text=B", items: [{ name: "Reparar Equipamento", price: 50 }, { name: "Lâmina Serrilhada", price: 250 }, { name: "Placas de Quitina", price: 400 }] },
        lucerina: { name: "Lucerina, a Cozinheira", title: `"Um estômago cheio luta melhor."`, description: "Lucerina faz milagres com as rações escassas, criando refeições que aquecem a alma.", image: "https://placehold.co/100x100/2a2a2a/c5a173?text=L", items: [{ name: "Ensopado Revigorante (+1 CON temp.)", price: 30 }, { name: "Pão de Raiz (Ração de Viagem)", price: 10 }, { name: "Chá de Ervas Raras (+1 SAB temp.)", price: 45 }] },
        rayllum: { name: "Rayllum, a Bibliotecária", title: `"O conhecimento é a única luz neste breu."`, description: "Guardiã do saber resgatado, Rayllum oferece pergaminhos e conhecimento arcano.", image: "https://placehold.co/100x100/2a2a2a/c5a173?text=R", items: [{ name: "Identificar Item", price: 100 }, { name: "Pergaminho de Proteção Menor", price: 150 }, { name: "Mapa de Bestiário (Incompleto)", price: 300 }] },
        miranda: { name: "Miranda, a Alquimista", title: `"A essência da vida e da morte em um frasco."`, description: "Miranda lida com substâncias perigosas para criar elixires potentes e venenos mortais.", image: "https://placehold.co/100x100/2a2a2a/c5a173?text=M", items: [{ name: "Poção de Cura Maior (4d6 PV)", price: 150 }, { name: "Frasco de Fogo Alquímico", price: 120 }, { name: "Veneno de Serpente das Cinzas", price: 200 }] },
        eveline: { name: "Eveline, a Condessa", title: `"Até no fim do mundo, há prazeres a serem encontrados."`, description: "Na Casa dos Prazeres, Eveline oferece um alívio fugaz das agruras de Kuar-Tor... por um preço.", image: "https://placehold.co/100x100/8c3a5a/ffffff?text=E", isLust: true, items: [{ name: "Uma Noite de Esquecimento (cura de stress)", price: 500 }, { name: "Um Segredo Sussurrado (dica de lore)", price: 350 }, { name: "Favor da Condessa (+1 CAR temp.)", price: 700 }] },
        corvus: { name: "Corvus, o Colecionador", title: `"Tudo tem um preço... especialmente o que não deveria estar à venda."`, description: "Uma figura sombria que sempre parece ter exatamente o que você precisa, ou o que você nem sabia que queria.", image: "https://placehold.co/100x100/1a1a1a/c5a173?text=C", items: [
            { id: 'wep_01', name: "Adaga de Osso Serrilhado", value: 350, type: 'arma' },
            { id: 'wep_02', name: "Machado Pesado de Sucata", value: 450, type: 'arma' },
            { id: 'arm_01', name: "Manto do Desbravador", value: 500, type: 'armadura' },
            { id: 'arm_02', name: "Escudo de Placa de Metal", value: 300, type: 'armadura' },
            { id: 'relic_02', name: "Lanterna de Alma-Penada", value: 1200, type: 'reliquia' },
            { id: 'relic_03', name: "Amuleto de Dente de Fera", value: 600, type: 'reliquia' },
            { id: 'cons_01', name: "Pó do Esquecimento (1 uso)", value: 200, type: 'consumivel' },
            { id: 'cons_03', name: "Estimulante Alquímico Instável", value: 180, type: 'consumivel' },
            { id: 'mat_03', name: "Peça de Autômato Danificada", value: 120, type: 'material' },
            { id: 'mat_04', name: "Cristal de Energia Tênue", value: 250, type: 'material' }
        ]}
    }
};

const main = async () => {
    try {
        await db.collection('santuario').doc('estadoGlobal').set(estadoGlobal);
        console.log("Database populated successfully!");
    } catch (error) {
        console.error("Error populating database: ", error);
    } finally {
        process.exit();
    }
};

main();
