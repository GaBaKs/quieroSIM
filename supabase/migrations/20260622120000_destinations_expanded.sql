-- Amplía el set curado de destinos de la landing: 44 países turísticos top
-- (foco LatAm + Europa + Asia) y 9 packs regionales (region 'Global', iso_match
-- = la lista de países exacta del plan regional). Idempotente: ON CONFLICT (slug).
-- La landing solo muestra destinos con ≥1 plan activo (buildCatalog), así que
-- agregar destinos sin planes es inocuo.
insert into destination (slug, name, code, region, flag, iso_match, sort_order) values
-- Packs regionales (region Global)
('europa','Europa','EU','Global','🇪🇺','AT,BE,BG,CH,CY,CZ,DE,DK,EE,ES,FI,FR,GB,GR,HR,HU,IE,IS,IT,LI,LT,LU,LV,MT,NL,NO,PL,PT,RO,RS,SE,SI,SK',23),
('latinoamerica','Latinoamérica','LATAM','Global','🌎','AR,BR,CL,CO,CR,EC,GF,MX,PA,PE,SV',24),
('asia-pacifico','Asia-Pacífico','APAC','Global','🌏','AU,ID,MY,NZ,PH,SG,TH,VN',25),
('balcanes','Balcanes','BALK','Global','🌍','AL,BA,BG,GR,HR,ME,MK,RO,RS,SI,TR',26),
('asia','Asia','ASIA','Global','🌏','CN,HK,ID,IN,JP,KH,KR,LK,MO,MY,PH,SG,TH,TW,VN',27),
('norteamerica','Norteamérica','NA','Global','🌎','CA,MX,US',28),
('medio-oriente','Medio Oriente','MEA','Global','🕌','AE,BH,EG,JO,KW,MA,QA,SA',29),
('asia-central','Cáucaso y Asia Central','CAS','Global','🌍','AM,GE,KG,KZ,RU,UZ',30),
('global','Global','WORLD','Global','🌐','AD,AE,AF,AL,AM,AN,AR,AT,AU,AZ,BA,BD,BE,BG,BH,BR,BY,CA,CD,CG,CH,CL,CN,CO,CR,CY,CZ,DE,DK,DZ,EC,EE,EG,ES,FI,FO,FR,GA,GB,GE,GF,GH,GI,GP,GR,HK,HR,HU,ID,IE,IL,IN,IQ,IS,IT,JM,JO,JP,KE,KG,KH,KR,KW,KZ,LA,LI,LK,LT,LU,LV,MA,MD,ME,MG,MK,MN,MO,MT,MU,MW,MX,MY,NE,NG,NL,NO,NP,NZ,PA,PE,PH,PK,PL,PT,PY,QA,RE,RO,RS,RU,SA,SE,SG,SI,SK,SV,TD,TH,TN,TR,TW,TZ,UA,UG,US,UY,UZ,VN,ZA,ZM',31),
-- Europa
('portugal','Portugal','PT','Europe','🇵🇹','PT',100),
('grecia','Grecia','GR','Europe','🇬🇷','GR',101),
('paises-bajos','Países Bajos','NL','Europe','🇳🇱','NL',102),
('austria','Austria','AT','Europe','🇦🇹','AT',103),
('irlanda','Irlanda','IE','Europe','🇮🇪','IE',104),
('croacia','Croacia','HR','Europe','🇭🇷','HR',105),
('polonia','Polonia','PL','Europe','🇵🇱','PL',106),
('chequia','Chequia','CZ','Europe','🇨🇿','CZ',107),
('hungria','Hungría','HU','Europe','🇭🇺','HU',108),
('suecia','Suecia','SE','Europe','🇸🇪','SE',109),
('dinamarca','Dinamarca','DK','Europe','🇩🇰','DK',110),
('belgica','Bélgica','BE','Europe','🇧🇪','BE',111),
('noruega','Noruega','NO','Europe','🇳🇴','NO',112),
('islandia','Islandia','IS','Europe','🇮🇸','IS',113),
('finlandia','Finlandia','FI','Europe','🇫🇮','FI',114),
-- Asia + Medio Oriente
('corea-del-sur','Corea del Sur','KR','Asia','🇰🇷','KR',115),
('singapur','Singapur','SG','Asia','🇸🇬','SG',116),
('indonesia','Indonesia','ID','Asia','🇮🇩','ID',117),
('vietnam','Vietnam','VN','Asia','🇻🇳','VN',118),
('malasia','Malasia','MY','Asia','🇲🇾','MY',119),
('filipinas','Filipinas','PH','Asia','🇵🇭','PH',120),
('hong-kong','Hong Kong','HK','Asia','🇭🇰','HK',121),
('taiwan','Taiwán','TW','Asia','🇹🇼','TW',122),
('israel','Israel','IL','Asia','🇮🇱','IL',123),
('india','India','IN','Asia','🇮🇳','IN',124),
('china','China','CN','Asia','🇨🇳','CN',125),
('emiratos-arabes-unidos','Emiratos Árabes Unidos','AE','Asia','🇦🇪','AE',126),
('arabia-saudita','Arabia Saudita','SA','Asia','🇸🇦','SA',127),
('sri-lanka','Sri Lanka','LK','Asia','🇱🇰','LK',128),
('australia','Australia','AU','Asia','🇦🇺','AU',129),
('nueva-zelanda','Nueva Zelanda','NZ','Asia','🇳🇿','NZ',130),
-- Américas
('ecuador','Ecuador','EC','Americas','🇪🇨','EC',131),
('costa-rica','Costa Rica','CR','Americas','🇨🇷','CR',132),
('uruguay','Uruguay','UY','Americas','🇺🇾','UY',133),
('paraguay','Paraguay','PY','Americas','🇵🇾','PY',134),
('bolivia','Bolivia','BO','Americas','🇧🇴','BO',135),
('panama','Panamá','PA','Americas','🇵🇦','PA',136),
('guatemala','Guatemala','GT','Americas','🇬🇹','GT',137),
('venezuela','Venezuela','VE','Americas','🇻🇪','VE',138),
('republica-dominicana','República Dominicana','DO','Americas','🇩🇴','DO',139),
-- África
('marruecos','Marruecos','MA','Africa','🇲🇦','MA',140),
('tunez','Túnez','TN','Africa','🇹🇳','TN',141),
('kenia','Kenia','KE','Africa','🇰🇪','KE',142),
('mauricio','Mauricio','MU','Africa','🇲🇺','MU',143)
on conflict (slug) do nothing;
