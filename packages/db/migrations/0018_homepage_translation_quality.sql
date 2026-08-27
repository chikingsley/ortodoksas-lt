CREATE TABLE `_homepage_alt_patch` (
	`translation_group_id` text NOT NULL,
	`content_index` integer NOT NULL,
	`lt` text NOT NULL,
	`en` text NOT NULL,
	`ru` text NOT NULL,
	`uk` text NOT NULL,
	`be` text NOT NULL,
	PRIMARY KEY (`translation_group_id`, `content_index`)
);--> statement-breakpoint

INSERT INTO `_homepage_alt_patch` (`translation_group_id`, `content_index`, `lt`, `en`, `ru`, `uk`, `be`) VALUES
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 11, 'Šv. Jono Krikštytojo bažnyčios akmeninis fasadas Neseberyje', 'Stone facade of St John the Baptist Church in Nessebar', 'Каменный фасад церкви Святого Иоанна Крестителя в Несебре', 'Кам’яний фасад церкви Святого Іоана Хрестителя в Несебрі', 'Каменны фасад царквы Святога Яна Хрысціцеля ў Несебры'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 12, 'Kunigas stovi prie senojo bulgariško užrašo bažnyčios viduje', 'Priest standing beside an old Bulgarian inscription inside the church', 'Священник стоит у старинной болгарской надписи внутри церкви', 'Священник стоїть біля старовинного болгарського напису всередині церкви', 'Святар стаіць каля старадаўняга балгарскага надпісу ўнутры царквы'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 15, 'Ikonografinis pano ant mūrinės bažnyčios sienos', 'Iconographic panel mounted on a brick church wall', 'Иконографическое панно на кирпичной стене церкви', 'Іконографічне панно на цегляній стіні церкви', 'Іканаграфічнае пано на цаглянай сцяне царквы'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 17, 'Senovinė Dievo Motinos ir šventųjų freska', 'Historic fresco of the Mother of God and saints', 'Старинная фреска Богородицы и святых', 'Старовинна фреска Богородиці та святих', 'Старажытная фрэска Маці Божай і святых'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 18, 'Kunigas stovi prie senovinių bažnyčios freskų', 'Priest standing beside historic church frescoes', 'Священник стоит рядом со старинными церковными фресками', 'Священник стоїть біля старовинних церковних фресок', 'Святар стаіць каля старадаўніх царкоўных фрэсак'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 19, 'Freskų siužetai virš medinių bažnyčios durų', 'Rows of fresco scenes above wooden church doors', 'Ряды фресковых сцен над деревянными церковными дверями', 'Ряди фрескових сцен над дерев’яними церковними дверима', 'Шэрагі фрэскавых сцэн над драўлянымі царкоўнымі дзвярыма'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 20, 'Dievo Motinos užmigimo freska', 'Fresco of the Dormition of the Mother of God', 'Фреска Успения Богородицы', 'Фреска Успіння Богородиці', 'Фрэска Успення Маці Божай'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 30, 'Kunigas Dievo Motinos užmigimo bažnyčios kieme', 'Priest in the courtyard of the Dormition Church', 'Священник во дворе церкви Успения Богородицы', 'Священник у дворі церкви Успіння Богородиці', 'Святар у двары царквы Успення Маці Божай'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 31, 'Reljefinis Nesebero senamiesčio planas', 'Relief map of Nessebar Old Town', 'Рельефная карта Старого Несебра', 'Рельєфна карта Старого Несебра', 'Рэльефная карта Старога Несебра'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 36, 'Puošnus Šv. Blažiejaus bažnyčios ikonostasas ir freskos', 'Decorated iconostasis and frescoes inside St Blaise Church', 'Украшенный иконостас и фрески в церкви Святого Власия', 'Оздоблений іконостас і фрески в церкві Святого Власія', 'Упрыгожаны іканастас і фрэскі ў царкве Святога Уласія'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 40, 'Žvakės ir ikonos Šv. Atanazo bažnyčios viduje', 'Candles and icons inside St Athanasius Church', 'Свечи и иконы внутри церкви Святого Афанасия', 'Свічки та ікони всередині церкви Святого Афанасія', 'Свечкі і іконы ўнутры царквы Святога Афанасія'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 41, 'Tikintieji susirinkę į sekmadienio liturgiją Šv. Atanazo bažnyčioje', 'Worshippers gathered for Sunday liturgy in St Athanasius Church', 'Верующие собрались на воскресную литургию в церкви Святого Афанасия', 'Віряни зібралися на недільну літургію в церкві Святого Афанасія', 'Вернікі сабраліся на нядзельную літургію ў царкве Святога Афанасія'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 42, 'Dvasininkai tarnauja sekmadienio liturgiją', 'Clergy serving the Sunday liturgy', 'Духовенство совершает воскресную литургию', 'Духовенство звершує недільну літургію', 'Духавенства служыць нядзельную літургію'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 43, 'Kunigai prie altoriaus per bendras pamaldas', 'Priests at the altar during a joint service', 'Священники у алтаря во время совместного богослужения', 'Священники біля вівтаря під час спільного богослужіння', 'Святары каля алтара падчас супольнага набажэнства'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 44, 'Seni liturginiai indai ir knygos muziejaus vitrinoje', 'Old liturgical vessels and books in a museum display', 'Старинные богослужебные сосуды и книги в музейной витрине', 'Старовинні богослужбові посудини та книги в музейній вітрині', 'Старадаўнія літургічныя сасуды і кнігі ў музейнай вітрыне'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 51, 'Lankytoja įeina į bokštą su šventojo vandens šaltiniu', 'Visitor entering the tower with a holy water spring', 'Посетительница входит в башню с источником святой воды', 'Відвідувачка входить до вежі з джерелом святої води', 'Наведвальніца ўваходзіць у вежу з крыніцай святой вады'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 53, 'Šv. Jurgio gyvenimo scena ant vienuolyno bokšto', 'Scene from the life of St George on the monastery tower', 'Сцена из жития Святого Георгия на монастырской башне', 'Сцена з життя Святого Георгія на монастирській вежі', 'Сцэна з жыцця Святога Георгія на манастырскай вежы'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 54, 'Kita Šv. Jurgio gyvenimo scena ant bokšto', 'Another scene from the life of St George on the tower', 'Другая сцена из жития Святого Георгия на башне', 'Інша сцена з життя Святого Георгія на вежі', 'Іншая сцэна з жыцця Святога Георгія на вежы'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 57, 'Kunigas stovi priešais vienuolyno bažnyčios ikonostasą', 'Priest standing before the iconostasis in the monastery church', 'Священник стоит перед иконостасом монастырской церкви', 'Священник стоїть перед іконостасом монастирської церкви', 'Святар стаіць перад іканастасам манастырскай царквы'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 58, 'Kunigas ir vaikas apžiūri puošnią ikonų kompoziciją', 'Priest and child looking at a decorated icon display', 'Священник и ребенок рассматривают украшенную композицию с иконами', 'Священник і дитина розглядають оздоблену композицію з іконами', 'Святар і дзіця разглядаюць упрыгожаную кампазіцыю з іконамі'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 62, 'Siuvinėti liturginiai drabužiai vienuolyno muziejuje', 'Embroidered liturgical vestments in the monastery museum', 'Вышитые богослужебные облачения в монастырском музее', 'Вишиті богослужбові облачення в монастирському музеї', 'Вышытыя літургічныя шаты ў манастырскім музеі'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 63, 'Istoriniai liturginiai indai ant raudono audinio', 'Historic liturgical vessels displayed on red cloth', 'Старинные богослужебные сосуды на красной ткани', 'Старовинні богослужбові посудини на червоній тканині', 'Старадаўнія літургічныя сасуды на чырвонай тканіне'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 64, 'Muziejaus vitrinos su senomis knygomis ir nuotraukomis', 'Museum display cases with old books and photographs', 'Музейные витрины со старыми книгами и фотографиями', 'Музейні вітрини зі старими книгами та фотографіями', 'Музейныя вітрыны са старымі кнігамі і фотаздымкамі'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 65, 'Sena knyga stiklinėje muziejaus vitrinoje', 'Old book displayed in a glass museum case', 'Старая книга в стеклянной музейной витрине', 'Стара книга у скляній музейній вітрині', 'Старая кніга ў шкляной музейнай вітрыне'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 67, 'Nedidelis gyvūnų aptvaras vienuolyno sode', 'Small animal enclosure in the monastery garden', 'Небольшой вольер для животных в монастырском саду', 'Невеликий вольєр для тварин у монастирському саду', 'Невялікі вальер для жывёл у манастырскім садзе'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 73, 'Freskomis ištapytos Šv. Kirilo ir Metodijaus bažnyčios lubos ir ikonostasas', 'Frescoed ceiling and iconostasis inside Saints Cyril and Methodius Church', 'Расписной потолок и иконостас в церкви Святых Кирилла и Мефодия', 'Розписана стеля та іконостас у церкві Святих Кирила і Мефодія', 'Распісаная столь і іканастас у царкве Святых Кірыла і Мяфодзія'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 74, 'Sietynas ir freskos Šv. Kirilo ir Metodijaus bažnyčioje', 'Chandelier and frescoes inside Saints Cyril and Methodius Church', 'Люстра и фрески в церкви Святых Кирилла и Мефодия', 'Люстра та фрески в церкві Святих Кирила і Мефодія', 'Люстра і фрэскі ў царкве Святых Кірыла і Мяфодзія'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 75, 'Šv. Kirilo ir Metodijaus bažnyčios vidus', 'Interior of Saints Cyril and Methodius Church', 'Интерьер церкви Святых Кирилла и Мефодия', 'Інтер’єр церкви Святих Кирила і Мефодія', 'Інтэр’ер царквы Святых Кірыла і Мяфодзія'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 76, 'Kunigas stovi po sienų freskomis', 'Priest standing beneath wall frescoes', 'Священник стоит под настенными фресками', 'Священник стоїть під настінними фресками', 'Святар стаіць пад насценнымі фрэскамі'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 80, 'Apšviestas ikonostasas su šventųjų ikonomis', 'Illuminated iconostasis with icons of saints', 'Освещенный иконостас с иконами святых', 'Освітлений іконостас з іконами святих', 'Асветлены іканастас з іконамі святых'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 81, 'Nedidelės ortodoksų bažnyčios įėjimas Sozopolyje', 'Entrance to a small Orthodox church in Sozopol', 'Вход в небольшую православную церковь в Созополе', 'Вхід до невеликої православної церкви в Созополі', 'Уваход у невялікую праваслаўную царкву ў Сазопалі'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 82, 'Kunigas su vaiku eina akmenimis grįsta Sozopolio gatve', 'Priest and child walking along a stone street in Sozopol', 'Священник и ребенок идут по каменной улице Созополя', 'Священник і дитина йдуть кам’яною вулицею Созополя', 'Святар і дзіця ідуць па каменнай вуліцы Сазопаля'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 83, 'Bažnyčios sienoje įmūrytas akmens įrašas su 1896 metų data', 'Dated stone inscription set into a church wall', 'Каменная надпись с датой 1896 года в стене церкви', 'Кам’яний напис із датою 1896 року в стіні церкви', 'Каменны надпіс з датай 1896 года ў сцяне царквы'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 84, 'Vaizdas per čerpinius stogus į Juodąją jūrą', 'View across tiled roofs to the Black Sea', 'Вид через черепичные крыши на Черное море', 'Краєвид через черепичні дахи на Чорне море', 'Від праз чарапічныя дахі на Чорнае мора'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 88, 'Lankytojai eina į istorinę Sozopolio bažnyčią', 'Visitors entering a historic church in Sozopol', 'Посетители входят в историческую церковь Созополя', 'Відвідувачі входять до історичної церкви Созополя', 'Наведвальнікі ўваходзяць у гістарычную царкву Сазопаля'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 89, 'Ikonostasas su apšviestomis ikonomis Sozopolio bažnyčioje', 'Iconostasis with illuminated icons inside a Sozopol church', 'Иконостас с освещенными иконами в церкви Созополя', 'Іконостас з освітленими іконами в церкві Созополя', 'Іканастас з асветленымі іконамі ў царкве Сазопаля'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 90, 'Mediniai choristų suolai ir ikonos bažnyčioje', 'Wooden choir stalls and icons inside the church', 'Деревянные хоры и иконы внутри церкви', 'Дерев’яні хори та ікони всередині церкви', 'Драўляныя хоры і іконы ўнутры царквы'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 95, 'Šv. Jurgio bažnyčios įėjimas Sozopolyje', 'Entrance porch of St George Church in Sozopol', 'Вход в церковь Святого Георгия в Созополе', 'Вхід до церкви Святого Георгія в Созополі', 'Уваход у царкву Святога Георгія ў Сазопалі'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 96, 'Gausiai dekoruotas bažnyčios vidus ir ikonostasas', 'Richly decorated church interior and iconostasis', 'Богато украшенный интерьер церкви и иконостас', 'Багато оздоблений інтер’єр церкви та іконостас', 'Багата ўпрыгожаны інтэр’ер царквы і іканастас'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 97, 'Kryžius ir ikonos virš ikonostaso', 'Cross and icons above an iconostasis', 'Крест и иконы над иконостасом', 'Хрест та ікони над іконостасом', 'Крыж і іконы над іканастасам'),
('88795b93-a9ee-4ba5-97fb-5bb654d67662', 0, 'Piligrimų bendra nuotrauka Pažaislio vienuolyno bažnyčioje', 'Group photograph of pilgrims inside Pažaislis Monastery church', 'Общая фотография паломников в церкви Пажайслисского монастыря', 'Спільна фотографія паломників у церкві Пажайсліського монастиря', 'Агульны фотаздымак паломнікаў у царкве Пажайсліскага манастыра'),
('88795b93-a9ee-4ba5-97fb-5bb654d67662', 6, 'Pažaislio vienuolyno bažnyčios kupolas ir sienų tapyba', 'Dome and wall paintings inside Pažaislis Monastery church', 'Купол и росписи церкви Пажайслисского монастыря', 'Купол і розписи церкви Пажайсліського монастиря', 'Купал і роспісы царквы Пажайсліскага манастыра'),
('88795b93-a9ee-4ba5-97fb-5bb654d67662', 7, 'Piligrimai eina per Pažaislio vienuolyno kiemą', 'Pilgrims walking through the courtyard of Pažaislis Monastery', 'Паломники идут по двору Пажайслисского монастыря', 'Паломники йдуть подвір’ям Пажайсліського монастиря', 'Паломнікі ідуць па двары Пажайсліскага манастыра'),
('88795b93-a9ee-4ba5-97fb-5bb654d67662', 8, 'Piligrimų ir dvasininkų bendra nuotrauka lauke', 'Group photograph of pilgrims and clergy outdoors', 'Общая фотография паломников и духовенства на открытом воздухе', 'Спільна фотографія паломників і духовенства надворі', 'Агульны фотаздымак паломнікаў і духавенства на адкрытым паветры'),
('88795b93-a9ee-4ba5-97fb-5bb654d67662', 9, 'Pamaldos Pažaislio vienuolyno bažnyčioje', 'Service inside Pažaislis Monastery church', 'Богослужение в церкви Пажайслисского монастыря', 'Богослужіння в церкві Пажайсліського монастиря', 'Набажэнства ў царкве Пажайсліскага манастыра'),
('88795b93-a9ee-4ba5-97fb-5bb654d67662', 10, 'Ortodoksų hierarchas meldžiasi Pažaislio vienuolyno bažnyčioje', 'Orthodox hierarch praying inside Pažaislis Monastery church', 'Православный иерарх молится в церкви Пажайслисского монастыря', 'Православний ієрарх молиться в церкві Пажайсліського монастиря', 'Праваслаўны іерарх моліцца ў царкве Пажайсліскага манастыра'),
('88795b93-a9ee-4ba5-97fb-5bb654d67662', 11, 'Hierarchas sveikina piligrimę bažnyčioje', 'Hierarch greeting a pilgrim inside the church', 'Иерарх приветствует паломницу в церкви', 'Ієрарх вітає паломницю в церкві', 'Іерарх вітае паломніцу ў царкве'),
('88795b93-a9ee-4ba5-97fb-5bb654d67662', 12, 'Trys ortodoksų dvasininkai vienuolyno kieme', 'Three Orthodox clergy standing in the monastery courtyard', 'Три православных священнослужителя во дворе монастыря', 'Троє православних священнослужителів у монастирському дворі', 'Тры праваслаўныя святары ў манастырскім двары'),
('88795b93-a9ee-4ba5-97fb-5bb654d67662', 13, 'Ortodoksų hierarchas prie gėlėmis puoštos ikonos', 'Orthodox hierarch beside an icon decorated with flowers', 'Православный иерарх рядом с иконой, украшенной цветами', 'Православний ієрарх біля ікони, прикрашеної квітами', 'Праваслаўны іерарх каля іконы, упрыгожанай кветкамі'),
('88795b93-a9ee-4ba5-97fb-5bb654d67662', 14, 'Pažaislio vienuolyno bažnyčia ilgo medžiais apsodinto tako gale', 'Pažaislis Monastery church at the end of a long tree-lined path', 'Церковь Пажайслисского монастыря в конце длинной аллеи', 'Церква Пажайсліського монастиря наприкінці довгої алеї', 'Царква Пажайсліскага манастыра ў канцы доўгай алеі'),
('88795b93-a9ee-4ba5-97fb-5bb654d67662', 15, 'Šviesus baltas Pažaislio vienuolyno koridorius', 'Bright white corridor inside Pažaislis Monastery', 'Светлый белый коридор Пажайслисского монастыря', 'Світлий білий коридор Пажайсліського монастиря', 'Светлы белы калідор Пажайсліскага манастыра'),
('88795b93-a9ee-4ba5-97fb-5bb654d67662', 16, 'Dvasininkai ir piligrimai eina per vienuolyno kiemą', 'Clergy and pilgrims walking through the monastery courtyard', 'Духовенство и паломники идут по монастырскому двору', 'Духовенство і паломники йдуть монастирським подвір’ям', 'Духавенства і паломнікі ідуць па манастырскім двары'),
('88795b93-a9ee-4ba5-97fb-5bb654d67662', 17, 'Baltais žiedais papuošta Dievo Motinos ikona', 'Icon of the Mother of God decorated with white flowers', 'Икона Богородицы, украшенная белыми цветами', 'Ікона Богородиці, прикрашена білими квітами', 'Ікона Маці Божай, упрыгожаная белымі кветкамі'),
('88795b93-a9ee-4ba5-97fb-5bb654d67662', 18, 'Dvasininkai ir piligrimai gieda lauke', 'Clergy and pilgrims singing outdoors', 'Духовенство и паломники поют на открытом воздухе', 'Духовенство і паломники співають надворі', 'Духавенства і паломнікі спяваюць на адкрытым паветры'),
('da52e0d2-3c90-462a-80a6-138a328d9f4a', 6, 'Šv. Alipijaus bažnyčios vidus su mediniu ikonostasu', 'Interior of St Alypius Church with a wooden iconostasis', 'Интерьер церкви Святого Алипия с деревянным иконостасом', 'Інтер’єр церкви Святого Аліпія з дерев’яним іконостасом', 'Інтэр’ер царквы Святога Аліпія з драўляным іканастасам'),
('da52e0d2-3c90-462a-80a6-138a328d9f4a', 11, 'Kunigas tarnauja prie analojaus Šv. Alipijaus bažnyčioje', 'Priest serving at the lectern inside St Alypius Church', 'Священник служит у аналоя в церкви Святого Алипия', 'Священник служить біля аналоя в церкві Святого Аліпія', 'Святар служыць каля аналоя ў царкве Святога Аліпія'),
('da52e0d2-3c90-462a-80a6-138a328d9f4a', 12, 'Dvasininkai per pamaldas Šv. Alipijaus bažnyčioje', 'Clergy during a service inside St Alypius Church', 'Духовенство во время богослужения в церкви Святого Алипия', 'Духовенство під час богослужіння в церкві Святого Аліпія', 'Духавенства падчас набажэнства ў царкве Святога Аліпія'),
('da52e0d2-3c90-462a-80a6-138a328d9f4a', 13, 'Kunigas skaito prie analojaus per pamaldas', 'Priest reading at the lectern during the service', 'Священник читает у аналоя во время богослужения', 'Священник читає біля аналоя під час богослужіння', 'Святар чытае каля аналоя падчас набажэнства'),
('da52e0d2-3c90-462a-80a6-138a328d9f4a', 14, 'Dvasininkai prie analojaus per pamaldas', 'Clergy gathered around the lectern during the service', 'Духовенство у аналоя во время богослужения', 'Духовенство біля аналоя під час богослужіння', 'Духавенства каля аналоя падчас набажэнства'),
('dac86e69-867d-4759-813b-4078ae57c6a9', 0, 'Žalias Lietuvos egzarchato ženklas su kryžiumi ir kristograma', 'Green emblem of the Lithuanian Exarchate with a cross and Christogram', 'Зеленая эмблема Литовского экзархата с крестом и христограммой', 'Зелена емблема Литовського екзархату з хрестом і христограмою', 'Зялёная эмблема Літоўскага экзархата з крыжам і хрыстаграмай');--> statement-breakpoint

WITH RECURSIVE
`ordered_patch` AS (
	SELECT
		`translation_group_id`,
		`content_index`,
		`lt`,
		`en`,
		`ru`,
		`uk`,
		`be`,
		row_number() OVER (PARTITION BY `translation_group_id` ORDER BY `content_index`) AS `step`,
		count(*) OVER (PARTITION BY `translation_group_id`) AS `step_count`
	FROM `_homepage_alt_patch`
),
`patched_article` (`article_id`, `translation_group_id`, `language`, `body_json`, `step`, `step_count`) AS (
	SELECT
		`article`.`id`,
		`article`.`translation_group_id`,
		`article`.`language`,
		`article`.`body_json`,
		0,
		(SELECT max(`patch`.`step_count`) FROM `ordered_patch` AS `patch` WHERE `patch`.`translation_group_id` = `article`.`translation_group_id`)
	FROM `articles` AS `article`
	WHERE `article`.`translation_group_id` IN (SELECT DISTINCT `translation_group_id` FROM `_homepage_alt_patch`)
	UNION ALL
	SELECT
		`article`.`article_id`,
		`article`.`translation_group_id`,
		`article`.`language`,
		json_set(
			`article`.`body_json`,
			'$.content[' || `patch`.`content_index` || '].attrs.alt',
			CASE `article`.`language`
				WHEN 'lt' THEN `patch`.`lt`
				WHEN 'en' THEN `patch`.`en`
				WHEN 'ru' THEN `patch`.`ru`
				WHEN 'uk' THEN `patch`.`uk`
				WHEN 'be' THEN `patch`.`be`
			END
		),
		`patch`.`step`,
		`patch`.`step_count`
	FROM `patched_article` AS `article`
	JOIN `ordered_patch` AS `patch`
		ON `patch`.`translation_group_id` = `article`.`translation_group_id`
		AND `patch`.`step` = `article`.`step` + 1
)
UPDATE `articles`
SET
	`body_json` = (
		SELECT `patched`.`body_json`
		FROM `patched_article` AS `patched`
		WHERE `patched`.`article_id` = `articles`.`id`
			AND `patched`.`step` = `patched`.`step_count`
	),
	`updated_at` = unixepoch('now') * 1000
WHERE `id` IN (
	SELECT `patched`.`article_id`
	FROM `patched_article` AS `patched`
	WHERE `patched`.`step` = `patched`.`step_count`
);--> statement-breakpoint

INSERT INTO `article_revisions` (`id`, `article_id`, `editor_id`, `version`, `body_json`, `metadata_json`, `created_at`)
SELECT
	lower(hex(randomblob(16))),
	`article`.`id`,
	'system:homepage-accessibility-review',
	(SELECT coalesce(max(`revision`.`version`), 0) + 1 FROM `article_revisions` AS `revision` WHERE `revision`.`article_id` = `article`.`id`),
	`article`.`body_json`,
	json_object(
		'byline', `article`.`byline`,
		'bylineType', `article`.`byline_type`,
		'bylineUrl', `article`.`byline_url`,
		'heroFit', `article`.`hero_fit`,
		'heroFocalX', `article`.`hero_focal_x`,
		'heroFocalY', `article`.`hero_focal_y`,
		'heroMediaId', `article`.`hero_media_id`,
		'kind', `article`.`kind`,
		'labels', json(`article`.`labels_json`),
		'language', `article`.`language`,
		'publishedAt', `article`.`published_at`,
		'section', `article`.`section`,
		'seoDescription', `article`.`seo_description`,
		'seoTitle', `article`.`seo_title`,
		'slug', `article`.`slug`,
		'snapshotCompleteness', 'complete',
		'snapshotVersion', 5,
		'status', `article`.`status`,
		'summary', `article`.`summary`,
		'title', `article`.`title`,
		'translationGroupId', `article`.`translation_group_id`,
		'translationKind', `article`.`translation_kind`,
		'translationReviewedAt', `article`.`translation_reviewed_at`,
		'translationReviewedBy', `article`.`translation_reviewed_by`,
		'translationReviewStatus', `article`.`translation_review_status`,
		'translationSourceArticleId', `article`.`translation_source_article_id`,
		'translationSourceHash', `article`.`translation_source_hash`
	),
	unixepoch('now') * 1000
FROM `articles` AS `article`
WHERE `article`.`translation_group_id` IN (SELECT DISTINCT `translation_group_id` FROM `_homepage_alt_patch`);--> statement-breakpoint

INSERT INTO `article_content_changes` (`id`, `article_id`, `field_path`, `change_kind`, `provenance`, `before_value`, `after_value`, `created_at`)
SELECT
	lower(hex(randomblob(16))),
	`article`.`id`,
	'body.content[' || `patch`.`content_index` || '].attrs.alt',
	'added',
	'editorial-review',
	NULL,
	CASE `article`.`language`
		WHEN 'lt' THEN `patch`.`lt`
		WHEN 'en' THEN `patch`.`en`
		WHEN 'ru' THEN `patch`.`ru`
		WHEN 'uk' THEN `patch`.`uk`
		WHEN 'be' THEN `patch`.`be`
	END,
	unixepoch('now') * 1000
FROM `articles` AS `article`
JOIN `_homepage_alt_patch` AS `patch`
	ON `patch`.`translation_group_id` = `article`.`translation_group_id`;--> statement-breakpoint

CREATE TABLE `_homepage_text_patch` (
	`translation_group_id` text NOT NULL,
	`language` text NOT NULL,
	`field_path` text NOT NULL,
	`content_index` integer,
	`after_value` text NOT NULL,
	PRIMARY KEY (`translation_group_id`, `language`, `field_path`)
);--> statement-breakpoint

INSERT INTO `_homepage_text_patch` (`translation_group_id`, `language`, `field_path`, `content_index`, `after_value`) VALUES
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 'be', 'body.content[8].text', 8, 'На месцы храма Апалона стаіць сабор Прамудрасці Божай (Сафіі), які часта называюць «Святой Сафіяй», хоць прысвечаны ён не святой Сафіі, а Прамудрасці Божай, як і старажытны Канстанцінопальскі сабор. Несебрскую Сафію пабудавалі ў канцы V і пачатку VI стагоддзя, і яна была галоўным кафедральным саборам Несебрскага мітрапаліта. Цяпер засталіся велічныя руіны трохнефнай базілікі з апсідай і епіскапскай лавай — сінтронам.'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 'ru', 'body.content[8].text', 8, 'На месте храма Аполлона стоит собор Премудрости Божией (Софии), который часто называют «Святой Софией», хотя посвящён он не святой Софии, а Премудрости Божией, как и древний Константинопольский собор. Несебрская София была построена в конце V и начале VI века и служила главным кафедральным собором Несебрского митрополита. Ныне от величественной трёхнефной базилики остались руины с апсидой и епископской скамьёй — синтроном.'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', 'uk', 'body.content[8].text', 8, 'На місці храму Аполлона стоїть собор Премудрості Божої (Софії), який часто називають «Святою Софією», хоча присвячений він не святій Софії, а Премудрості Божій, як і давній Константинопольський собор. Несебирську Софію збудували наприкінці V і на початку VI століття, і вона була головним кафедральним собором Несебирського митрополита. Нині залишилися величні руїни тринефної базиліки з апсидою та єпископською лавою – синтроном.'),
('9e994efb-55b6-492d-b238-686a939a5253', 'be', 'body.content[12].text', 12, 'Ён выказаў салідарнасць з усімі жыхарамі Венесуэлы і заклікаў вернікаў узмацніць малітву і аказваць гуманітарную дапамогу. Іерарх падкрэсліў, што сэрцам ён з народам Венесуэлы, які перажывае наступствы гэтай трагедыі.'),
('9e994efb-55b6-492d-b238-686a939a5253', 'ru', 'body.content[12].text', 12, 'Он выразил солидарность со всеми жителями Венесуэлы и призвал верующих усилить молитву и оказывать гуманитарную помощь. Иерарх подчеркнул, что сердцем он с народом Венесуэлы, переживающим последствия этой трагедии.'),
('9e994efb-55b6-492d-b238-686a939a5253', 'uk', 'body.content[12].text', 12, 'Він висловив солідарність з усіма жителями Венесуели та закликав вірян посилити молитву й надавати гуманітарну допомогу. Ієрарх підкреслив, що серцем він з народом Венесуели, який переживає наслідки цієї трагедії.'),
('9e994efb-55b6-492d-b238-686a939a5253', 'be', 'body.content[33].text', 33, 'У навучанні ўдзельнічаюць дваццаць студэнтаў, сярод іх пачаткоўцы і дасведчаныя майстры, якія ўжо прадэманстравалі значны прагрэс. Мітрапаліт Карэйскі Амвросій асабіста павіншаваў студэнтаў з вынікамі іх працы.'),
('9e994efb-55b6-492d-b238-686a939a5253', 'ru', 'body.content[33].text', 33, 'В обучении участвуют двадцать студентов, среди них начинающие и опытные мастера, уже продемонстрировавшие значительный прогресс. Митрополит Корейский Амвросий лично поздравил студентов с результатами их работы.'),
('9e994efb-55b6-492d-b238-686a939a5253', 'uk', 'body.content[33].text', 33, 'У навчанні беруть участь двадцять студентів, серед них початківці й досвідчені майстри, які вже продемонстрували значний поступ. Митрополит Корейський Амвросій особисто привітав студентів із результатами їхньої роботи.'),
('d011d07d-f537-48c4-a518-5283d4f20040', 'en', 'body.content[9].text', 9, 'From 1866 to 1869, an uprising took place in Crete against Ottoman rule, seeking the island’s union with free Greece. Although that goal remained unachieved at the time, the uprising aroused widespread sympathy for the Cretans among the European public. During the uprising, fighters and residents of the surrounding villages, including men, women, and children, took refuge in the Monastery of St Arcadius. Monastery sources record 964 people. '),
('d62dc236-0733-4b1c-8023-6ae705ef8bbf', 'en', 'body.content[9].text', 9, 'St John Chrysostom says that Christ first heals what is invisible, the man’s soul, by forgiving his sins. He then heals the body as well, showing that His words are not empty and that He truly has authority to forgive sins.'),
('d97b3511-e131-4984-ba1d-4262ed2de8c6', 'be', 'body.content[10].text', 10, '«[У той час] Ісус спытаў вучняў: „За каго людзі лічаць Сына Чалавечага?“ Яны адказалі: „Адны лічаць Янам Хрысціцелем, другія Іллёй, а іншыя Ярэміяй або адным з прарокаў“. Ён зноў спытаў: „А вы за каго Мяне лічыце?“ Тады Сымон Пётр адказаў: „Ты Хрыстос, Сын Бога Жывога!“ Ісус сказаў яму: „Шчаслівы ты, Сымоне, сыне Ёны, бо не цела і кроў адкрылі табе гэта, а Айцец Мой, Які на нябёсах. І Я кажу табе: ты Пётр, Скала, і на гэтай скале Я збудую Царкву Маю, і брамы пекла не адолеюць яе. Я дам табе ключы Валадарства Нябеснага: што звяжаш на зямлі, будзе звязана на нябёсах, і што развяжаш на зямлі, будзе развязана на нябёсах“». (Мц 16:13–19) '),
('d97b3511-e131-4984-ba1d-4262ed2de8c6', 'en', 'body.content[10].text', 10, '“[At that time] Jesus asked his disciples, ‘Who do people say that the Son of Man is?’ They answered, ‘Some say John the Baptist, others Elijah, and still others Jeremiah or one of the prophets.’ He asked them again, ‘But who do you say that I am?’ Simon Peter answered, ‘You are the Messiah, the Son of the living God!’ Jesus said to him, ‘Blessed are you, Simon son of Jonah, for flesh and blood have not revealed this to you, but my Father who is in heaven. And I tell you: you are Peter, the Rock, and on this rock I will build my Church, and the gates of Hades shall not prevail against it. I will give you the keys of the kingdom of heaven; whatever you bind on earth will be bound in heaven, and whatever you loose on earth will be loosed in heaven.’” (Mt 16:13–19) '),
('d97b3511-e131-4984-ba1d-4262ed2de8c6', 'ru', 'body.content[10].text', 10, '«[В то время] Иисус спросил учеников: „За кого люди почитают Меня, Сына Человеческого?“ Они отвечали: „Одни за Иоанна Крестителя, другие за Илию, а иные за Иеремию или за одного из пророков“. Он снова спросил их: „А вы за кого почитаете Меня?“ Тогда Симон Петр ответил: „Ты Христос, Сын Бога Живого!“ Иисус сказал ему: „Блажен ты, Симон, сын Ионин, потому что не плоть и кровь открыли тебе это, но Отец Мой, сущий на небесах. И Я говорю тебе: ты Петр, Камень, и на этом камне Я создам Церковь Мою, и врата ада не одолеют ее. И дам тебе ключи Царства Небесного: что свяжешь на земле, будет связано на небесах, и что разрешишь на земле, будет разрешено на небесах“». (Мф 16:13–19) '),
('d97b3511-e131-4984-ba1d-4262ed2de8c6', 'uk', 'body.content[10].text', 10, '«[У той час] Ісус запитав учнів: „За кого люди вважають Сина Людського?“ Вони відповіли: „Одні вважають Іоаном Хрестителем, інші Іллею, ще інші Єремією або одним із пророків“. Він знову запитав: „А ви за кого Мене вважаєте?“ Тоді Симон Петро відповів: „Ти Христос, Син Бога Живого!“ Ісус сказав йому: „Блаженний ти, Симоне, сину Йони, бо не тіло й кров відкрили тобі це, а Отець Мій, Який на небесах. І Я кажу тобі: ти Петро, Скеля, і на цій скелі Я збудую Церкву Мою, і ворота пекла не здолають її. Я дам тобі ключі Царства Небесного: що зв’яжеш на землі, буде зв’язане на небесах, і що розв’яжеш на землі, буде розв’язане на небесах“». (Мт 16:13–19) '),
('d97b3511-e131-4984-ba1d-4262ed2de8c6', 'lt', 'summary', NULL, 'Šv. Petras ir Paulius (Povilas) – du iškiliausieji Visuotinės Bažnyčios apaštalai. Vienas jų buvo ankstyvosios Bažnyčios lyderis, vyriausias apaštalas, kitas – „tautų apaštalas“, atvedęs pas Kristų daugybę buvusių pagonių. Jų minėjimo dieną skaitomi šie skaitiniai.'),
('d97b3511-e131-4984-ba1d-4262ed2de8c6', 'en', 'summary', NULL, 'Saints Peter and Paul are two of the foremost apostles of the Universal Church. One was a leader of the early Church and the chief apostle; the other was the “apostle to the nations,” who brought many former pagans to Christ. The following readings are appointed for their feast day.'),
('d97b3511-e131-4984-ba1d-4262ed2de8c6', 'ru', 'summary', NULL, 'Святые Петр и Павел — два первоверховных апостола Вселенской Церкви. Один был руководителем ранней Церкви и первым среди апостолов, другой — «апостолом народов», приведшим ко Христу множество бывших язычников. В день их памяти читаются следующие чтения.'),
('d97b3511-e131-4984-ba1d-4262ed2de8c6', 'uk', 'summary', NULL, 'Святі Петро і Павло – два першоверховні апостоли Вселенської Церкви. Один був провідником ранньої Церкви й першим серед апостолів, другий – «апостолом народів», який привів до Христа безліч колишніх язичників. У день їхньої пам’яті читають такі читання.'),
('d97b3511-e131-4984-ba1d-4262ed2de8c6', 'be', 'summary', NULL, 'Святыя Пётр і Павел — два першавярхоўныя апосталы Сусветнай Царквы. Адзін быў кіраўніком ранняй Царквы і першым сярод апосталаў, другі — «апосталам народаў», які прывёў да Хрыста мноства былых язычнікаў. У дзень іх памяці чытаюцца наступныя чытанні.');--> statement-breakpoint

WITH RECURSIVE
`ordered_text_patch` AS (
	SELECT
		`translation_group_id`,
		`language`,
		`content_index`,
		`after_value`,
		row_number() OVER (PARTITION BY `translation_group_id`, `language` ORDER BY `content_index`) AS `step`,
		count(*) OVER (PARTITION BY `translation_group_id`, `language`) AS `step_count`
	FROM `_homepage_text_patch`
	WHERE `field_path` <> 'summary'
),
`patched_text_article` (`article_id`, `translation_group_id`, `language`, `body_json`, `step`, `step_count`) AS (
	SELECT
		`article`.`id`,
		`article`.`translation_group_id`,
		`article`.`language`,
		`article`.`body_json`,
		0,
		(SELECT max(`patch`.`step_count`) FROM `ordered_text_patch` AS `patch` WHERE `patch`.`translation_group_id` = `article`.`translation_group_id` AND `patch`.`language` = `article`.`language`)
	FROM `articles` AS `article`
	WHERE EXISTS (
		SELECT 1 FROM `ordered_text_patch` AS `patch`
		WHERE `patch`.`translation_group_id` = `article`.`translation_group_id`
			AND `patch`.`language` = `article`.`language`
	)
	UNION ALL
	SELECT
		`article`.`article_id`,
		`article`.`translation_group_id`,
		`article`.`language`,
		json_set(
			`article`.`body_json`,
			'$.content[' || `patch`.`content_index` || '].content[0].text',
			`patch`.`after_value`
		),
		`patch`.`step`,
		`patch`.`step_count`
	FROM `patched_text_article` AS `article`
	JOIN `ordered_text_patch` AS `patch`
		ON `patch`.`translation_group_id` = `article`.`translation_group_id`
		AND `patch`.`language` = `article`.`language`
		AND `patch`.`step` = `article`.`step` + 1
)
UPDATE `articles`
SET
	`body_json` = (
		SELECT `patched`.`body_json`
		FROM `patched_text_article` AS `patched`
		WHERE `patched`.`article_id` = `articles`.`id`
			AND `patched`.`step` = `patched`.`step_count`
	),
	`updated_at` = unixepoch('now') * 1000
WHERE `id` IN (
	SELECT `patched`.`article_id`
	FROM `patched_text_article` AS `patched`
	WHERE `patched`.`step` = `patched`.`step_count`
);--> statement-breakpoint

UPDATE `articles`
SET
	`summary` = (
		SELECT `patch`.`after_value`
		FROM `_homepage_text_patch` AS `patch`
		WHERE `patch`.`translation_group_id` = `articles`.`translation_group_id`
			AND `patch`.`language` = `articles`.`language`
			AND `patch`.`field_path` = 'summary'
	),
	`updated_at` = unixepoch('now') * 1000
WHERE EXISTS (
	SELECT 1
	FROM `_homepage_text_patch` AS `patch`
	WHERE `patch`.`translation_group_id` = `articles`.`translation_group_id`
		AND `patch`.`language` = `articles`.`language`
		AND `patch`.`field_path` = 'summary'
);--> statement-breakpoint

INSERT INTO `article_content_changes` (`id`, `article_id`, `field_path`, `change_kind`, `provenance`, `before_value`, `after_value`, `created_at`)
SELECT
	lower(hex(randomblob(16))),
	`article`.`id`,
	`patch`.`field_path`,
	'changed',
	'editorial-review',
	NULL,
	`patch`.`after_value`,
	unixepoch('now') * 1000
FROM `articles` AS `article`
JOIN `_homepage_text_patch` AS `patch`
	ON `patch`.`translation_group_id` = `article`.`translation_group_id`
	AND `patch`.`language` = `article`.`language`;--> statement-breakpoint

INSERT INTO `article_revisions` (`id`, `article_id`, `editor_id`, `version`, `body_json`, `metadata_json`, `created_at`)
SELECT
	lower(hex(randomblob(16))),
	`article`.`id`,
	'system:homepage-translation-review',
	(SELECT coalesce(max(`revision`.`version`), 0) + 1 FROM `article_revisions` AS `revision` WHERE `revision`.`article_id` = `article`.`id`),
	`article`.`body_json`,
	json_object(
		'byline', `article`.`byline`, 'bylineType', `article`.`byline_type`, 'bylineUrl', `article`.`byline_url`,
		'heroFit', `article`.`hero_fit`, 'heroFocalX', `article`.`hero_focal_x`, 'heroFocalY', `article`.`hero_focal_y`,
		'heroMediaId', `article`.`hero_media_id`, 'kind', `article`.`kind`, 'labels', json(`article`.`labels_json`),
		'language', `article`.`language`, 'publishedAt', `article`.`published_at`, 'section', `article`.`section`,
		'seoDescription', `article`.`seo_description`, 'seoTitle', `article`.`seo_title`, 'slug', `article`.`slug`,
		'snapshotCompleteness', 'complete', 'snapshotVersion', 5, 'status', `article`.`status`,
		'summary', `article`.`summary`, 'title', `article`.`title`, 'translationGroupId', `article`.`translation_group_id`,
		'translationKind', `article`.`translation_kind`, 'translationReviewedAt', `article`.`translation_reviewed_at`,
		'translationReviewedBy', `article`.`translation_reviewed_by`, 'translationReviewStatus', `article`.`translation_review_status`,
		'translationSourceArticleId', `article`.`translation_source_article_id`, 'translationSourceHash', `article`.`translation_source_hash`
	),
	unixepoch('now') * 1000
FROM `articles` AS `article`
WHERE EXISTS (
	SELECT 1 FROM `_homepage_text_patch` AS `patch`
	WHERE `patch`.`translation_group_id` = `article`.`translation_group_id`
		AND `patch`.`language` = `article`.`language`
);--> statement-breakpoint

DROP TABLE `_homepage_text_patch`;--> statement-breakpoint

UPDATE `community_localizations`
SET
	`description` = CASE `language`
		WHEN 'lt' THEN `name` || ' – Konstantinopolio patriarchato Lietuvos egzarchato bendruomenė. Adresas: ' || `address_label` || '.'
		WHEN 'en' THEN `name` || ', a community of the Lithuanian Exarchate of the Ecumenical Patriarchate. Address: ' || `address_label` || '.'
		WHEN 'ru' THEN `name` || ' — община Литовского экзархата Вселенского патриархата. Адрес: ' || `address_label` || '.'
		WHEN 'uk' THEN `name` || ' — громада Литовського екзархату Вселенського патріархату. Адреса: ' || `address_label` || '.'
		WHEN 'be' THEN `name` || ' — супольнасць Літоўскага экзархата Сусветнага патрыярхата. Адрас: ' || `address_label` || '.'
	END,
	`seo_description` = CASE `language`
		WHEN 'lt' THEN `name` || ' – Konstantinopolio patriarchato Lietuvos egzarchato bendruomenė. Adresas: ' || `address_label` || '.'
		WHEN 'en' THEN `name` || ', a community of the Lithuanian Exarchate of the Ecumenical Patriarchate. Address: ' || `address_label` || '.'
		WHEN 'ru' THEN `name` || ' — община Литовского экзархата Вселенского патриархата. Адрес: ' || `address_label` || '.'
		WHEN 'uk' THEN `name` || ' — громада Литовського екзархату Вселенського патріархату. Адреса: ' || `address_label` || '.'
		WHEN 'be' THEN `name` || ' — супольнасць Літоўскага экзархата Сусветнага патрыярхата. Адрас: ' || `address_label` || '.'
	END
WHERE `community_id` IN (SELECT `id` FROM `communities` WHERE `status` = 'published')
	AND `address_label` <> ''
	AND `description` = ''
	AND `seo_description` = '';--> statement-breakpoint

UPDATE `communities`
SET `updated_at` = unixepoch('now') * 1000
WHERE `status` = 'published'
	AND `id` IN (
		SELECT `community_id`
		FROM `community_localizations`
		WHERE `description` <> '' AND `seo_description` <> ''
	);--> statement-breakpoint

CREATE TABLE `_homepage_alt_quality_gate` (
	`missing_alt_count` integer NOT NULL CHECK (`missing_alt_count` = 0)
);--> statement-breakpoint

INSERT INTO `_homepage_alt_quality_gate` (`missing_alt_count`)
SELECT count(*)
FROM `articles` AS `article`, json_tree(`article`.`body_json`) AS `node`
WHERE `article`.`translation_group_id` IN (SELECT DISTINCT `translation_group_id` FROM `_homepage_alt_patch`)
	AND `node`.`type` = 'text'
	AND `node`.`key` = 'alt'
	AND trim(CAST(`node`.`value` AS text)) = '';--> statement-breakpoint

DROP TABLE `_homepage_alt_quality_gate`;--> statement-breakpoint

CREATE TABLE `_homepage_review_patch` (
	`translation_group_id` text PRIMARY KEY NOT NULL,
	`source_hash` text NOT NULL
);--> statement-breakpoint

INSERT INTO `_homepage_review_patch` (`translation_group_id`, `source_hash`) VALUES
('da52e0d2-3c90-462a-80a6-138a328d9f4a', '9d7b2935ebb2d0c5575f379dceeee0718b17bad6205da1c7a9f5083a49cb1240'),
('2b9c0571-68e2-4236-be6c-7b5b47ac8a4a', '414f5c876e6b49af7d1480963a1660a9610fd9fbdc1ca507d6eecc6b19bb2efa'),
('b53da35a-3571-41dd-b59e-465b7d6ce0fd', '352fc34608cf446587daa402de96b50b9a4b5e4a46de18e58cab416006f08468'),
('d62dc236-0733-4b1c-8023-6ae705ef8bbf', '342b0700980d43521820ab93ec81aed7822f7ab02ad88df35325950b8d32b3e2'),
('88795b93-a9ee-4ba5-97fb-5bb654d67662', '01a67d7c6034b98e49f0b5ad9c032d0735f34c8ccabe60e3538609fadf5a9bbd'),
('d011d07d-f537-48c4-a518-5283d4f20040', '4cace166004be833b9b62b8a157ef142593f47932dad5c4a44b5ad4d30c62646'),
('dac86e69-867d-4759-813b-4078ae57c6a9', '2ae8c6e62c96a7f3b0eba57dee2ff2f13f139d72e814a198d5d57645b58eed68'),
('d97b3511-e131-4984-ba1d-4262ed2de8c6', '8432e398ee2032c719d7a0edea0e691cadcdcd11a0be8c1aee5d777cf127cc0a'),
('9e994efb-55b6-492d-b238-686a939a5253', '03f2d1e0be869260ce387b5b62e96bd197250e92dc89be817944174c0bd09b27'),
('3d8a2eb2-81dc-4893-a250-4a0bc86523b5', 'c6d9e48ee39ba060ed1d426f0d8734329574f921091e780b05933dc8d87412e7'),
('545a328c-d08d-41c3-8ec6-be0a05c70eeb', 'd9df5042cfdb5f9cfea67652bd299d2783c423d7b5c5e00a8b2e1f6b3f33d9ed'),
('fc5d50ea-5233-4565-834c-24b43aaaa580', '6823ca37c925d1b694645bf9af1dd3a34b61ef1a1bd0809e2c9337fbeec4ef6d'),
('f616733c-ea8a-4a47-96b4-42e6e5e676e4', '21780ac0ca71a4000b68469dfebf19465e87bb8ac68d8a80fd261b36a89765e0');--> statement-breakpoint

UPDATE `articles`
SET
	`translation_source_hash` = (
		SELECT `patch`.`source_hash`
		FROM `_homepage_review_patch` AS `patch`
		WHERE `patch`.`translation_group_id` = `articles`.`translation_group_id`
	),
	`translation_review_status` = 'approved',
	`translation_reviewed_at` = unixepoch('now') * 1000,
	`translation_reviewed_by` = 'system:codex-homepage-review',
	`updated_at` = unixepoch('now') * 1000
WHERE `language` <> 'lt'
	AND `translation_kind` = 'machine'
	AND `status` = 'published'
	AND `translation_group_id` IN (SELECT `translation_group_id` FROM `_homepage_review_patch`);--> statement-breakpoint

INSERT INTO `article_content_changes` (`id`, `article_id`, `field_path`, `change_kind`, `provenance`, `before_value`, `after_value`, `created_at`)
SELECT
	lower(hex(randomblob(16))),
	`article`.`id`,
	'translationReviewStatus',
	'changed',
	'editorial-review',
	'pending',
	'approved',
	unixepoch('now') * 1000
FROM `articles` AS `article`
WHERE `article`.`language` <> 'lt'
	AND `article`.`translation_group_id` IN (SELECT `translation_group_id` FROM `_homepage_review_patch`);--> statement-breakpoint

INSERT INTO `article_revisions` (`id`, `article_id`, `editor_id`, `version`, `body_json`, `metadata_json`, `created_at`)
SELECT
	lower(hex(randomblob(16))),
	`article`.`id`,
	'system:codex-homepage-review',
	(SELECT coalesce(max(`revision`.`version`), 0) + 1 FROM `article_revisions` AS `revision` WHERE `revision`.`article_id` = `article`.`id`),
	`article`.`body_json`,
	json_object(
		'byline', `article`.`byline`, 'bylineType', `article`.`byline_type`, 'bylineUrl', `article`.`byline_url`,
		'heroFit', `article`.`hero_fit`, 'heroFocalX', `article`.`hero_focal_x`, 'heroFocalY', `article`.`hero_focal_y`,
		'heroMediaId', `article`.`hero_media_id`, 'kind', `article`.`kind`, 'labels', json(`article`.`labels_json`),
		'language', `article`.`language`, 'publishedAt', `article`.`published_at`, 'section', `article`.`section`,
		'seoDescription', `article`.`seo_description`, 'seoTitle', `article`.`seo_title`, 'slug', `article`.`slug`,
		'snapshotCompleteness', 'complete', 'snapshotVersion', 5, 'status', `article`.`status`,
		'summary', `article`.`summary`, 'title', `article`.`title`, 'translationGroupId', `article`.`translation_group_id`,
		'translationKind', `article`.`translation_kind`, 'translationReviewedAt', `article`.`translation_reviewed_at`,
		'translationReviewedBy', `article`.`translation_reviewed_by`, 'translationReviewStatus', `article`.`translation_review_status`,
		'translationSourceArticleId', `article`.`translation_source_article_id`, 'translationSourceHash', `article`.`translation_source_hash`
	),
	unixepoch('now') * 1000
FROM `articles` AS `article`
WHERE `article`.`language` <> 'lt'
	AND `article`.`translation_group_id` IN (SELECT `translation_group_id` FROM `_homepage_review_patch`);--> statement-breakpoint

DROP TABLE `_homepage_review_patch`;--> statement-breakpoint
DROP TABLE `_homepage_alt_patch`;
